import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders }  from "../_shared/cors.ts";

interface RequestBody {
  client_id: string;
  period?:   "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
  format?:   "json" | "html";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number | null) {
  if (n == null) return "N/A";
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body: RequestBody = await req.json();
    const { client_id, period = "1Y", format = "json" } = body;

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch client ─────────────────────────────────────────────────────
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select(`
        id, first_name, last_name, date_of_birth, risk_profile,
        last_review_date, created_at,
        adviser:advisers(first_name, last_name, email),
        firm:firms(name)
      `)
      .eq("id", client_id)
      .single();

    if (cErr || !client) throw new Error(`Client ${client_id} not found: ${cErr?.message}`);

    // ── Fetch wrappers + holdings ────────────────────────────────────────
    const { data: wrappers } = await supabase
      .from("tax_wrappers")
      .select(`
        id, wrapper_type, platform_name, currency,
        sub_accounts(
          id, name, sub_account_type,
          holdings(
            units, avg_cost_basis, last_price, last_price_date,
            asset:assets(isin, name, asset_class, currency)
          )
        ),
        valuations(valuation_date, market_value, cost_basis)
      `)
      .eq("client_id", client_id)
      .eq("is_active", true)
      .order("wrapper_type");

    // ── Call calculate-performance function ──────────────────────────────
    const perfUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/calculate-performance`;
    let perfData: { series?: unknown[] } = {};
    try {
      const perfRes = await fetch(perfUrl, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ client_id, period }),
      });
      perfData = await perfRes.json();
    } catch {
      // Non-fatal — report without performance metrics
    }

    // ── Compute summary values ───────────────────────────────────────────
    const wrapperSummaries = (wrappers ?? []).map((w) => {
      const latestVal = [...(w.valuations ?? [])]
        .sort((a: { valuation_date: string }, b: { valuation_date: string }) =>
          b.valuation_date.localeCompare(a.valuation_date)
        )[0];

      const holdings = (w.sub_accounts ?? []).flatMap(
        (sa: { holdings?: unknown[] }) => sa.holdings ?? []
      );

      return {
        wrapper_type:   w.wrapper_type,
        platform_name:  w.platform_name ?? "—",
        currency:       w.currency,
        market_value:   latestVal ? Number(latestVal.market_value) : 0,
        cost_basis:     latestVal ? Number(latestVal.cost_basis)   : 0,
        valuation_date: latestVal ? latestVal.valuation_date       : null,
        holdings_count: holdings.length,
      };
    });

    const totalAUM     = wrapperSummaries.reduce((s, w) => s + w.market_value, 0);
    const totalCostBasis = wrapperSummaries.reduce((s, w) => s + w.cost_basis, 0);
    const unrealised   = totalAUM - totalCostBasis;

    const reportPayload = {
      report_meta: {
        generated_at:  new Date().toISOString(),
        period,
        report_type:   "CLIENT_PORTFOLIO_REVIEW",
        firm_name:     (client.firm as { name?: string })?.name ?? "—",
        adviser_name:  client.adviser
          ? `${(client.adviser as { first_name?: string }).first_name} ${(client.adviser as { last_name?: string }).last_name}`
          : "—",
      },
      client: {
        id:               client.id,
        name:             `${client.first_name} ${client.last_name}`,
        risk_profile:     client.risk_profile,
        last_review_date: client.last_review_date,
      },
      portfolio_summary: {
        total_aum:        totalAUM,
        total_cost_basis: totalCostBasis,
        unrealised_gain:  unrealised,
        unrealised_pct:   totalCostBasis > 0 ? (unrealised / totalCostBasis) * 100 : null,
        wrapper_count:    wrapperSummaries.length,
      },
      wrappers: wrapperSummaries,
      performance: perfData,
    };

    // ── Return JSON or HTML ──────────────────────────────────────────────
    if (format === "html") {
      const html = buildHtmlReport(reportPayload);

      // Store in Supabase Storage
      const fileName = `reports/${client_id}/${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
      await supabase.storage
        .from("reports")
        .upload(fileName, html, { contentType: "text/html", upsert: true });

      const { data: signed } = await supabase.storage
        .from("reports")
        .createSignedUrl(fileName, 3600); // 1-hour link

      return new Response(
        JSON.stringify({ signed_url: signed?.signedUrl, report: reportPayload }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(reportPayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-report error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Minimal HTML report template ─────────────────────────────────────────────

function buildHtmlReport(data: {
  report_meta:       { generated_at: string; period: string; firm_name: string; adviser_name: string };
  client:            { name: string; risk_profile: string; last_review_date?: string };
  portfolio_summary: { total_aum: number; total_cost_basis: number; unrealised_gain: number; unrealised_pct: number | null; wrapper_count: number };
  wrappers:          { wrapper_type: string; platform_name: string; market_value: number; cost_basis: number; valuation_date: string | null }[];
  performance:       { series?: { wrapper_type: string; metrics: { twr: number | null; xirr: number | null; cagr: number | null } }[] };
}): string {
  const { report_meta, client, portfolio_summary, wrappers, performance } = data;

  const wrapperRows = wrappers.map((w) => {
    const perf = performance?.series?.find((s) => s.wrapper_type === w.wrapper_type);
    return `
      <tr>
        <td>${w.wrapper_type.replace("_", " ")}</td>
        <td>${w.platform_name}</td>
        <td class="num">${fmt(w.market_value)}</td>
        <td class="num">${fmt(w.cost_basis)}</td>
        <td class="num ${(w.market_value - w.cost_basis) >= 0 ? "pos" : "neg"}">
          ${fmt(w.market_value - w.cost_basis)}
        </td>
        <td class="num">${perf ? fmtPct(perf.metrics.twr) : "—"}</td>
        <td class="num">${perf ? fmtPct(perf.metrics.xirr) : "—"}</td>
        <td>${w.valuation_date ? fmtDate(w.valuation_date) : "—"}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Portfolio Review — ${client.name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 40px; }
  h1   { font-size: 22px; margin: 0 0 4px; }
  h2   { font-size: 14px; font-weight: 600; color: #475569; margin: 32px 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 32px; }
  .summary { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 32px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; min-width: 160px; }
  .card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
  .card-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th    { text-align: left; padding: 8px 12px; background: #f8fafc; font-weight: 600; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
  td    { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .num  { text-align: right; font-variant-numeric: tabular-nums; }
  .pos  { color: #059669; }
  .neg  { color: #dc2626; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<h1>Portfolio Review — ${client.name}</h1>
<p class="meta">
  Generated ${fmtDate(report_meta.generated_at)} &nbsp;·&nbsp;
  Period: ${report_meta.period} &nbsp;·&nbsp;
  Adviser: ${report_meta.adviser_name} &nbsp;·&nbsp;
  ${report_meta.firm_name}<br>
  Risk Profile: ${client.risk_profile.replace(/_/g, " ")}
  ${client.last_review_date ? ` &nbsp;·&nbsp; Last Review: ${fmtDate(client.last_review_date)}` : ""}
</p>

<div class="summary">
  <div class="card">
    <div class="card-label">Total AUM</div>
    <div class="card-value">${fmt(portfolio_summary.total_aum)}</div>
  </div>
  <div class="card">
    <div class="card-label">Cost Basis</div>
    <div class="card-value">${fmt(portfolio_summary.total_cost_basis)}</div>
  </div>
  <div class="card">
    <div class="card-label">Unrealised G/L</div>
    <div class="card-value ${portfolio_summary.unrealised_gain >= 0 ? "pos" : "neg"}">
      ${fmt(portfolio_summary.unrealised_gain)}
    </div>
  </div>
  <div class="card">
    <div class="card-label">Wrappers</div>
    <div class="card-value">${portfolio_summary.wrapper_count}</div>
  </div>
</div>

<h2>Tax Wrapper Breakdown</h2>
<table>
  <thead>
    <tr>
      <th>Wrapper</th>
      <th>Platform</th>
      <th class="num">Market Value</th>
      <th class="num">Cost Basis</th>
      <th class="num">Unrealised G/L</th>
      <th class="num">TWR</th>
      <th class="num">XIRR</th>
      <th>As at</th>
    </tr>
  </thead>
  <tbody>
    ${wrapperRows}
  </tbody>
</table>

<p class="footer">
  This document is produced for information purposes only. Past performance is not a reliable indicator of future results.
  Performance figures are calculated using Time-Weighted Return (TWR) and Extended Internal Rate of Return (XIRR) methodologies.
  Book-over (in-specie) transfers are excluded from cash-flow series. All values in GBP unless stated.
</p>
</body>
</html>`;
}
