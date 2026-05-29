import { useRef, useState, useCallback } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { PageShell }     from "../components/shared/PageShell";
import { useImportJobs, useUploadCSV } from "../hooks/useImportJobs";
import type { ImportJob, ImportStatus } from "../hooks/useImportJobs";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";

// ── Column mapping ────────────────────────────────────────────────────────────

const CANONICAL_FIELDS = [
  { key: "date",             label: "Trade Date",        required: true  },
  { key: "transaction_type", label: "Transaction Type",  required: true  },
  { key: "isin",             label: "ISIN",              required: false },
  { key: "asset_name",       label: "Asset / Fund Name", required: false },
  { key: "units",            label: "Units",             required: false },
  { key: "price",            label: "Price",             required: false },
  { key: "currency",         label: "Currency",          required: false },
  { key: "fees",             label: "Fees / Charges",    required: false },
  { key: "reference",        label: "Reference",         required: false },
] as const;

type CanonicalKey = typeof CANONICAL_FIELDS[number]["key"];

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ImportStatus, { label: string; icon: React.ComponentType<{ className?: string }>; classes: string }> = {
  PENDING:    { label: "Pending",    icon: Clock,          classes: "text-slate-500 bg-slate-100"        },
  PROCESSING: { label: "Processing", icon: Clock,          classes: "text-blue-600 bg-blue-50"           },
  COMPLETED:  { label: "Completed",  icon: CheckCircle2,   classes: "text-emerald-600 bg-emerald-50"     },
  FAILED:     { label: "Failed",     icon: XCircle,        classes: "text-rose-500 bg-rose-50"           },
};

function StatusBadge({ status }: { status: ImportStatus }) {
  const { label, icon: Icon, classes } = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", classes)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function fmtRelativeDate(iso: string) {
  const d   = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Job row component ─────────────────────────────────────────────────────────

function JobRow({ job }: { job: ImportJob }) {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = (job.error_log?.length ?? 0) > 0;
  const pct = job.rows_total > 0 ? Math.round((job.rows_processed / job.rows_total) * 100) : 0;

  return (
    <>
      <tr
        className={cn(
          "border-b border-[#E2E8F0] transition-colors",
          hasErrors ? "cursor-pointer hover:bg-[#F8FAFC]" : ""
        )}
        onClick={() => hasErrors && setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 text-sm text-[#0F172A] font-medium">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-xs">{job.storage_path?.split("/").pop() ?? "—"}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{job.source}</span>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={job.status} />
        </td>
        <td className="px-4 py-3">
          {job.rows_total > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden w-24">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    job.rows_failed > 0 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                {job.rows_processed}/{job.rows_total}
                {job.rows_failed > 0 && (
                  <span className="text-amber-600 ml-1">({job.rows_failed} err)</span>
                )}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
          {fmtRelativeDate(job.created_at)}
        </td>
        <td className="px-4 py-3 w-8">
          {hasErrors && (
            expanded
              ? <ChevronDown  className="w-4 h-4 text-slate-400" />
              : <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </td>
      </tr>

      {expanded && hasErrors && (
        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <td colSpan={6} className="px-4 py-3">
            <p className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {job.error_log!.length} row error{job.error_log!.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-1">
              {job.error_log!.map((e, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="text-slate-500 tabular-nums shrink-0">Row {e.row}</span>
                  <span className="text-rose-500">{e.message}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Column mapping panel ──────────────────────────────────────────────────────

function ColumnMapper({
  headers,
  mapping,
  onChange,
}: {
  headers:  string[];
  mapping:  Partial<Record<CanonicalKey, string>>;
  onChange: (key: CanonicalKey, value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">
        Map your CSV columns to the required fields. Unset optional fields will be skipped.
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {CANONICAL_FIELDS.map(({ key, label, required }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-xs text-slate-500 w-36 shrink-0">
              {label}
              {required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            <select
              value={mapping[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="flex-1 bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#002147] focus:border-[#002147]"
            >
              <option value="">— not mapped —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Import() {
  const { data: jobs = [] }   = useImportJobs();
  const { mutateAsync: upload, isPending } = useUploadCSV();

  const [dragging,  setDragging]  = useState(false);
  const [file,      setFile]      = useState<File | null>(null);
  const [source,    setSource]    = useState<"CSV" | "FINIO" | "TRANSACT">("CSV");
  const [headers,   setHeaders]   = useState<string[]>([]);
  const [mapping,   setMapping]   = useState<Partial<Record<CanonicalKey, string>>>({});
  const [result,    setResult]    = useState<{ ok: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function readHeaders(f: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text  = e.target?.result as string;
      const first = text.split(/\r?\n/)[0] ?? "";
      const hdrs  = first.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(hdrs);

      const auto: Partial<Record<CanonicalKey, string>> = {};
      const lower = hdrs.map((h) => h.toLowerCase());
      CANONICAL_FIELDS.forEach(({ key }) => {
        const candidates: string[] = {
          date:             ["date", "trade date", "trade_date", "transaction date"],
          transaction_type: ["type", "transaction type", "transaction_type", "tx type"],
          isin:             ["isin"],
          asset_name:       ["asset", "fund", "name", "asset name", "fund name", "description"],
          units:            ["units", "quantity", "qty", "shares"],
          price:            ["price", "unit price", "nav"],
          currency:         ["currency", "ccy"],
          fees:             ["fees", "charges", "commission"],
          reference:        ["reference", "ref", "id", "external ref"],
        }[key] ?? [];
        const match = candidates.find((c) => lower.includes(c));
        if (match) {
          const actual = hdrs[lower.indexOf(match)];
          if (actual) auto[key] = actual;
        }
      });
      setMapping(auto);
    };
    reader.readAsText(f);
  }

  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setResult({ ok: false, message: "Only CSV files are supported." });
      return;
    }
    setFile(f);
    setResult(null);
    readHeaders(f);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  async function handleUpload() {
    if (!file) return;

    const missing = CANONICAL_FIELDS.filter(
      ({ key, required }) => required && !mapping[key]
    );
    if (missing.length > 0) {
      setResult({ ok: false, message: `Please map required fields: ${missing.map((f) => f.label).join(", ")}` });
      return;
    }

    try {
      const res = await upload({ file, source });
      setResult({
        ok:      res.rows_failed === 0,
        message: res.rows_failed === 0
          ? `Successfully imported ${res.rows_processed} transactions.`
          : `Imported ${res.rows_processed} rows — ${res.rows_failed} errors. Check the job log below.`,
      });
      setFile(null);
      setHeaders([]);
      setMapping({});
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    }
  }

  return (
    <PageShell title="Import Data">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Upload panel */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-semibold text-[#0F172A]">Upload CSV</h2>
          </div>

          <div className="p-5 space-y-5">
            {/* Source selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 w-20">Source</span>
              <div className="flex gap-2">
                {(["CSV", "FINIO", "TRANSACT"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      source === s
                        ? "bg-[#E8F0FE] border-[#002147]/20 text-[#002147]"
                        : "border-[#E2E8F0] text-slate-500 hover:text-[#0F172A] hover:border-slate-300"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                dragging
                  ? "border-[#002147] bg-[#E8F0FE]/40"
                  : file
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-[#E2E8F0] hover:border-slate-300 hover:bg-[#F8FAFC]"
              )}
            >
              {file ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400" />
                  <p className="text-sm font-medium text-[#0F172A]">Drop a CSV file here, or click to browse</p>
                  <p className="text-xs text-slate-500">Supports standard transaction exports from Transact, Finio, or generic CSV</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Column mapping */}
            {headers.length > 0 && (
              <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC]">
                <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide mb-4">Column Mapping</h3>
                <ColumnMapper headers={headers} mapping={mapping} onChange={(k, v) => setMapping((m) => ({ ...m, [k]: v || undefined }))} />
              </div>
            )}

            {/* Result message */}
            {result && (
              <div className={cn(
                "flex items-start gap-2.5 text-sm rounded-lg px-4 py-3",
                result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
              )}>
                {result.ok
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  : <XCircle      className="w-4 h-4 mt-0.5 shrink-0" />}
                {result.message}
              </div>
            )}

            {/* Upload button */}
            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!file || isPending}
                className="min-w-36"
              >
                {isPending ? "Processing…" : file ? `Import ${source}` : "Select a File"}
              </Button>
            </div>
          </div>
        </div>

        {/* Job history */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-semibold text-[#0F172A]">Import History</h2>
          </div>

          {jobs.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">No imports yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Rows</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Created</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => <JobRow key={job.id} job={job} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Format guide */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
          <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide mb-3">Supported CSV Formats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name:    "Generic / Custom",
                desc:    "Any CSV with a header row. Use the column mapping tool above to match your columns.",
                fields:  "date, type, isin, units, price, currency, fees",
              },
              {
                name:    "Transact Export",
                desc:    "Standard transaction export from Transact platform. Dates in DD/MM/YYYY format are supported.",
                fields:  "Trade Date, Transaction Type, ISIN, Quantity, Price, Currency, Charges",
              },
              {
                name:    "Finio Export",
                desc:    "Valuation and transaction exports from Finio. Auto-detected when source is set to FINIO.",
                fields:  "tradeDate, txType, isin, units, unitPrice, currency, fees",
              },
            ].map(({ name, desc, fields }) => (
              <div key={name} className="text-xs">
                <p className="font-semibold text-[#0F172A] mb-1">{name}</p>
                <p className="text-slate-500 mb-2">{desc}</p>
                <code className="text-slate-400 font-mono text-[10px] break-all">{fields}</code>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
