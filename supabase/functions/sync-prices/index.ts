/**
 * sync-prices — EODHD price feed
 *
 * Fetches end-of-day prices for all instruments using EODHD's bulk endpoint,
 * stores them in instrument_prices_daily, then calls refresh_holding_prices()
 * to push the latest price into holdings.current_price / current_value.
 *
 * Exchanges processed: LSE · US · EUFUND
 * Currency handling:   GBX ÷ 100 → GBP  |  USD × FX rate → GBP
 *
 * Triggered by: pg_cron (22:30 UTC Mon–Fri) or manual POST
 * Auth:         Authorization: Bearer {SYNC_PRICES_SECRET}
 *
 * Prerequisites (run supabase/migrations/005_price_sync.sql first):
 *   - instrument_prices_daily table
 *   - instruments.quote_currency, instruments.price_scale columns
 *   - refresh_holding_prices() function
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Env ──────────────────────────────────────────────────────────────────────

const EODHD_KEY    = Deno.env.get("EODHD_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")  ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SYNC_SECRET  = Deno.env.get("SYNC_PRICES_SECRET") ?? "";

const BASE      = "https://eodhd.com/api";
const EXCHANGES = ["LSE", "US", "EUFUND"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkRow {
  code:           string;
  date:           string;
  close:          number;
  adjusted_close: number;
}

interface SyncResult {
  exchange:        string;
  prices_upserted: number;
  error?:          string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eohdCode(fullCode: string): string {
  return fullCode.split(".")[0].toUpperCase();
}

function toGbp(close: number, quoteCurrency: string, usdToGbp: number): number {
  switch (quoteCurrency) {
    case "GBX": return close / 100;
    case "USD":  return close * usdToGbp;
    case "EUR":  return close * usdToGbp * 1.17;
    default:     return close;
  }
}

async function eohdFetch<T>(path: string): Promise<T | null> {
  const url = `${BASE}/${path}${path.includes("?") ? "&" : "?"}api_token=${EODHD_KEY}&fmt=json`;
  const res  = await fetch(url);
  if (!res.ok) {
    console.error(`EODHD ${path} → HTTP ${res.status}`);
    return null;
  }
  return res.json() as Promise<T>;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (SYNC_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${SYNC_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (!EODHD_KEY) {
    return new Response(JSON.stringify({ error: "EODHD_API_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: SyncResult[] = [];

  // ── 1. GBP/USD FX rate ──────────────────────────────────────────────────────
  const fxData   = await eohdFetch<{ close: number }[]>("eod/GBPUSD.FOREX?order=d&limit=1");
  const gbpUsd   = fxData?.[0]?.close ?? 1.27;
  const usdToGbp = 1 / gbpUsd;
  console.log(`FX: 1 GBP = ${gbpUsd.toFixed(4)} USD`);

  // ── 2. Per-exchange bulk fetch ───────────────────────────────────────────────
  for (const exchange of EXCHANGES) {
    const result: SyncResult = { exchange, prices_upserted: 0 };

    try {
      const bulk = await eohdFetch<BulkRow[]>(`eod-bulk-last-day/${exchange}`);
      if (!bulk || !Array.isArray(bulk)) {
        result.error = "Empty or invalid bulk response";
        results.push(result);
        continue;
      }

      const priceMap = new Map<string, BulkRow>(
        bulk.map((r) => [r.code.toUpperCase(), r]),
      );
      console.log(`${exchange}: ${bulk.length} prices fetched`);

      // Load instruments for this exchange — needs quote_currency + price_scale
      const { data: instruments, error: instErr } = await supabase
        .from("instruments")
        .select("id, eodhd_code, quote_currency, price_scale")
        .like("eodhd_code", `%.${exchange}`);

      if (instErr) {
        console.error(`instruments query:`, instErr.message);
        result.error = instErr.message;
        results.push(result);
        continue;
      }

      if (!instruments?.length) {
        console.log(`${exchange}: no instruments configured`);
        results.push(result);
        continue;
      }

      const rows = [];
      for (const inst of instruments) {
        const bulkRow = priceMap.get(eohdCode(inst.eodhd_code));
        if (!bulkRow) continue;

        const quoteCurrency = inst.quote_currency ?? "GBP";
        const rawClose      = bulkRow.close;
        const closeGbp      = toGbp(rawClose, quoteCurrency, usdToGbp);

        rows.push({
          instrument_id:     inst.id,
          price_date:        bulkRow.date,
          close_price_quote: rawClose,
          close_price_gbp:   closeGbp,
          source:            "eodhd",
        });
      }

      if (rows.length) {
        const { error } = await supabase
          .from("instrument_prices_daily")
          .upsert(rows, { onConflict: "instrument_id,price_date" });

        if (error) {
          console.error(`instrument_prices_daily upsert:`, error.message);
          result.error = error.message;
        } else {
          result.prices_upserted = rows.length;
          console.log(`${exchange}: ${rows.length} prices stored`);
        }
      }
    } catch (err) {
      result.error = String(err);
      console.error(`${exchange} error:`, err);
    }

    results.push(result);
  }

  // ── 3. Push latest prices into holdings ──────────────────────────────────────
  const { error: refreshErr } = await supabase.rpc("refresh_holding_prices");
  if (refreshErr) {
    console.error("refresh_holding_prices:", refreshErr.message);
  } else {
    console.log("Holdings prices refreshed");
  }

  const totalPrices = results.reduce((s, r) => s + r.prices_upserted, 0);
  console.log(`Done — ${totalPrices} prices stored`);

  return new Response(
    JSON.stringify({
      success:   true,
      fx_gbpusd: gbpUsd,
      exchanges: results,
      totals:    { prices: totalPrices },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
