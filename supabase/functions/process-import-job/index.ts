import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders }  from "../_shared/cors.ts";

interface RequestBody {
  job_id: string;
}

// Minimal CSV parser — handles quoted fields and CRLF/LF
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    if (vals.every((v) => v === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

// Normalise common transaction type aliases to DB enum values
const TX_ALIASES: Record<string, string> = {
  purchase: "BUY", buy: "BUY", sale: "SELL", sell: "SELL",
  div: "DIVIDEND", dividend: "DIVIDEND", interest: "INTEREST",
  fee: "FEE", charge: "FEE", tax: "TAX",
  "transfer in": "TRANSFER_IN_CASH", "transfer out": "TRANSFER_OUT_CASH",
  contribution: "CONTRIBUTION", withdrawal: "WITHDRAWAL",
};

function normaliseTxType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return TX_ALIASES[lower] ?? raw.toUpperCase().replace(/\s+/g, "_");
}

// Normalise date strings to ISO YYYY-MM-DD
function normaliseDate(raw: string): string | null {
  if (!raw) return null;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
  // MM/DD/YYYY
  const mmddyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) return `${mmddyyyy[3]}-${mmddyyyy[1].padStart(2, "0")}-${mmddyyyy[2].padStart(2, "0")}`;
  // Fallback — try native Date parsing
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
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
    const { job_id }: RequestBody = await req.json();
    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as PROCESSING
    const { data: job, error: jobErr } = await supabase
      .from("import_jobs")
      .update({ status: "PROCESSING", started_at: new Date().toISOString() })
      .eq("id", job_id)
      .select()
      .single();

    if (jobErr || !job) {
      throw new Error(`Import job ${job_id} not found: ${jobErr?.message}`);
    }

    if (!job.storage_path) {
      throw new Error("Import job has no storage_path — cannot process");
    }

    // Download CSV from Supabase Storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("imports")
      .download(job.storage_path);

    if (dlErr || !fileData) {
      throw new Error(`Failed to download ${job.storage_path}: ${dlErr?.message}`);
    }

    const csvText = await fileData.text();
    const rows    = parseCSV(csvText);
    const errors: { row: number; message: string }[] = [];
    let processed = 0;

    // Fetch the first sub_account for this firm as default target
    // (production would derive sub_account from CSV column mapping stored on the job)
    const { data: defaultSubAccounts } = await supabase
      .from("sub_accounts")
      .select("id")
      .eq("firm_id", job.firm_id)
      .limit(1);

    const defaultSubAccountId = defaultSubAccounts?.[0]?.id;
    if (!defaultSubAccountId) {
      throw new Error("No sub-accounts found for this firm — create a client first");
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const tradeDate = normaliseDate(
          row.trade_date ?? row.date ?? row.transaction_date ?? row.settlement_date ?? ""
        );
        if (!tradeDate) throw new Error(`Cannot parse date from row: ${JSON.stringify(row)}`);

        const rawTxType = row.transaction_type ?? row.type ?? row.tx_type ?? "BUY";
        const txType    = normaliseTxType(rawTxType);

        const units      = row.units ? parseFloat(row.units) : null;
        const price      = row.price ? parseFloat(row.price) : null;
        const fees       = parseFloat(row.fees ?? row.charges ?? "0") || 0;
        const grossAmount = units && price ? Math.abs(units * price) : Math.abs(parseFloat(row.amount ?? row.gross_amount ?? "0"));
        const netAmount   = grossAmount - fees;
        const currency    = (row.currency ?? "GBP").toUpperCase().slice(0, 3);

        // Resolve asset by ISIN if present
        let assetId: string | null = null;
        const isin = (row.isin ?? "").trim().toUpperCase();
        if (isin) {
          const { data: existing } = await supabase
            .from("assets")
            .select("id")
            .eq("isin", isin)
            .maybeSingle();

          if (existing) {
            assetId = existing.id;
          } else {
            // Create a minimal asset record
            const { data: newAsset } = await supabase
              .from("assets")
              .insert({
                isin,
                name:       row.asset_name ?? row.description ?? row.name ?? isin,
                asset_class: "EQUITY",
                currency,
              })
              .select("id")
              .single();
            assetId = newAsset?.id ?? null;
          }
        }

        const subAccountId =
          // future: look up sub_account by platform_reference stored in CSV
          defaultSubAccountId;

        await supabase.from("transactions").insert({
          firm_id:          job.firm_id,
          sub_account_id:   subAccountId,
          asset_id:         assetId,
          transaction_type: txType,
          trade_date:       tradeDate,
          settlement_date:  normaliseDate(row.settlement_date ?? ""),
          units:            units,
          price:            price,
          gross_amount:     grossAmount,
          net_amount:       netAmount,
          fees,
          currency,
          is_book_over:     false,
          external_ref:     row.reference ?? row.ref ?? row.external_ref ?? null,
          notes:            row.notes ?? row.description ?? null,
        });

        processed++;
      } catch (rowErr: unknown) {
        errors.push({ row: i + 2, message: String(rowErr) });
      }
    }

    // Update job to COMPLETED (or FAILED if all rows errored)
    const finalStatus = processed === 0 && errors.length > 0 ? "FAILED" : "COMPLETED";
    await supabase
      .from("import_jobs")
      .update({
        status:         finalStatus,
        rows_total:     rows.length,
        rows_processed: processed,
        rows_failed:    errors.length,
        error_log:      errors.length > 0 ? errors : null,
        completed_at:   new Date().toISOString(),
      })
      .eq("id", job_id);

    return new Response(
      JSON.stringify({
        job_id,
        status:     finalStatus,
        rows_total:     rows.length,
        rows_processed: processed,
        rows_failed:    errors.length,
        errors:     errors.slice(0, 20), // first 20 errors for response
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-import-job error:", err);

    // Mark job as FAILED if we have a job_id
    try {
      const body = await req.json().catch(() => ({}));
      if (body.job_id) {
        await supabase
          .from("import_jobs")
          .update({ status: "FAILED", error_log: [{ row: 0, message: String(err) }], completed_at: new Date().toISOString() })
          .eq("id", body.job_id);
      }
    } catch {
      // best-effort
    }

    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
