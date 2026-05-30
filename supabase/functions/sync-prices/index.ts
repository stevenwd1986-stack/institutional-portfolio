/**
 * sync-prices — EODHD price feed
 *
 * Fetches end-of-day prices for all instruments (advise-platform) and assets
 * (institutional schema) using EODHD's bulk endpoint.
 *
 * Exchanges processed: LSE · US · EUFUND
 * Currency handling:   GBX ÷ 100 → GBP  |  USD × FX rate → GBP
 *
 * Triggered by: pg_cron (22:30 UTC Mon–Fri) or manual POST
 * Auth:         Authorization: Bearer {SYNC_PRICES_SECRET}
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Env ──────────────────────────────────────────────────────────────────────

const EODHD_KEY       = Deno.env.get("EODHD_API_KEY") ?? "";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")  ?? "";
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SYNC_SECRET     = Deno.env.get("SYNC_PRICES_SECRET") ?? "";

const BASE            = "https://eodhd.com/api";
const EXCHANGES       = ["LSE", "US", "EUFUND"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkRow {
  code:                string;
  exchange_short_name: string;
  date:                string;
  open:                number;
  high:                number;
  low:                 number;
  close:               number;
  adjusted_close:      number;
  volume:              number;
}

interface SyncResult {
  exchange:                 string;
  instrument_prices_upserted: number;
  asset_prices_upserted:    number;
  error?:                   string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eodhCode(fullCode: string): string {
  return fullCode.split(".")[0].toUpperCase();
}

/** Convert raw EODHD close to GBP */
function toGbp(
  close: number,
  quoteCurrency: string,
  usdToGbp: number,
): number {
  switch (quoteCurrency) {
    case "GBX": return close / 100;          // pence → pounds
    case "USD": return close * usdToGbp;
    case "EUR": return close * usdToGbp * 1.17; // rough EUR/GBP — replace with live rate if needed
    default:    return close;                 // already GBP
  }
}

/** Fetch JSON from EODHD, return null on failure */
async function eodhFetch<T>(path: string): Promise<T | null> {
  const url = `${BASE}/${path}${path.includes("?") ? "&" : "?"}api_token=${EODHD_KEY}&fmt=json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`EODHD ${path} → HTTP ${res.status}`);
    return null;
  }
  return res.json() as Promise<T>;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Auth ──
  if (SYNC_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${SYNC_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (!EODHD_KEY) {
    return new Response(JSON.stringify({ error: "EODHD_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: SyncResult[] = [];

  // ── 1. GBP/USD FX rate ──────────────────────────────────────────────────────
  const fxData = await eodhFetch<{ close: number }[]>("eod/GBPUSD.FOREX?order=d&limit=1");
  const gbpUsd  = fxData?.[0]?.close ?? 1.27;
  const usdToGbp = 1 / gbpUsd;
  console.log(`FX: 1 GBP = ${gbpUsd.toFixed(4)} USD`);

  // ── 2. Per-exchange bulk fetch ───────────────────────────────────────────────
  for (const exchange of EXCHANGES) {
    const result: SyncResult = {
      exchange,
      instrument_prices_upserted: 0,
      asset_prices_upserted: 0,
    };

    try {
      // Fetch bulk prices for this exchange
      const bulk = await eodhFetch<BulkRow[]>(`eod-bulk-last-day/${exchange}`);
      if (!bulk || !Array.isArray(bulk)) {
        result.error = "Empty or invalid bulk response";
        results.push(result);
        continue;
      }

      // Build lookup: CODE → BulkRow
      const priceMap = new Map<string, BulkRow>(
        bulk.map((r) => [r.code.toUpperCase(), r]),
      );
      console.log(`${exchange}: ${bulk.length} prices fetched`);

      // ── Advise-platform instruments ──────────────────────────────────────────
      const { data: instruments, error: instErr } = await supabase
        .from("instruments")
        .select("id, eodhd_code, quote_currency, price_scale")
        .like("eodhd_code", `%.${exchange}`);

      if (instErr) {
        console.error(`instruments query error:`, instErr.message);
      } else if (instruments?.length) {
        const rows = [];
        for (const inst of instruments) {
          const row = priceMap.get(eodhCode(inst.eodhd_code));
          if (!row) continue;

          const rawClose  = row.close;
          const closeGbp  = toGbp(rawClose, inst.quote_currency, usdToGbp);
          const scale     = inst.price_scale ?? 1;
          const scaledGbp = inst.quote_currency === "GBX"
            ? rawClose / scale           // already handled above but keep consistent
            : closeGbp;

          rows.push({
            instrument_id:    inst.id,
            price_date:       row.date,
            close_price_quote: rawClose,
            close_price_gbp:  inst.quote_currency === "GBX" ? rawClose / scale : closeGbp,
            source:           "eodhd",
          });
        }

        if (rows.length) {
          const { error } = await supabase
            .from("instrument_prices_daily")
            .upsert(rows, { onConflict: "instrument_id,price_date" });
          if (error) console.error(`instrument_prices_daily upsert:`, error.message);
          else result.instrument_prices_upserted = rows.length;
        }
      }

      // ── Institutional assets ─────────────────────────────────────────────────
      const { data: assets, error: assetErr } = await supabase
        .from("assets")
        .select("id, eodhd_code, currency")
        .like("eodhd_code", `%.${exchange}`);

      if (assetErr) {
        console.error(`assets query error:`, assetErr.message);
      } else if (assets?.length) {
        const rows = [];
        for (const asset of assets) {
          const row = priceMap.get(eodhCode(asset.eodhd_code!));
          if (!row) continue;

          // Determine quote currency from the EODHD code exchange context
          // LSE instruments default to GBX unless asset.currency = GBP
          let quoteCurrency = asset.currency ?? "GBP";
          if (exchange === "LSE" && quoteCurrency === "GBP") {
            // Most LSE instruments are priced in pence; check by size of close
            quoteCurrency = row.close > 200 ? "GBX" : "GBP";
          }

          const closeGbp = toGbp(row.close, quoteCurrency, usdToGbp);
          rows.push({
            asset_id:   asset.id,
            price_date: row.date,
            close:      closeGbp,
            currency:   "GBP",
          });
        }

        if (rows.length) {
          const { error } = await supabase
            .from("asset_prices")
            .upsert(rows, { onConflict: "asset_id,price_date" });
          if (error) console.error(`asset_prices upsert:`, error.message);
          else result.asset_prices_upserted = rows.length;
        }
      }
    } catch (err) {
      result.error = String(err);
      console.error(`${exchange} error:`, err);
    }

    results.push(result);
  }

  // ── 3. Refresh holdings.last_price from asset_prices ────────────────────────
  const { error: refreshErr } = await supabase.rpc("refresh_holding_prices");
  if (refreshErr) console.error("refresh_holding_prices:", refreshErr.message);

  // ── 4. Summary ───────────────────────────────────────────────────────────────
  const totalInstruments = results.reduce((s, r) => s + r.instrument_prices_upserted, 0);
  const totalAssets      = results.reduce((s, r) => s + r.asset_prices_upserted, 0);
  console.log(`Done — ${totalInstruments} instrument prices, ${totalAssets} asset prices updated`);

  return new Response(
    JSON.stringify({
      success: true,
      fx_gbpusd: gbpUsd,
      exchanges: results,
      totals: { instrument_prices: totalInstruments, asset_prices: totalAssets },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
