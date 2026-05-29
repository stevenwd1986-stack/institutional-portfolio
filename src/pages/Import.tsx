import { useRef, useState, useCallback } from "react";
import {
  Upload, FileText, CheckCircle2, XCircle, Clock,
  AlertTriangle, ChevronDown, ChevronRight, ArrowRight,
} from "lucide-react";
import { PageShell }     from "../components/shared/PageShell";
import { useImportJobs, useUploadCSV } from "../hooks/useImportJobs";
import type { ImportJob, ImportStatus } from "../hooks/useImportJobs";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";

// ── Provider definitions ──────────────────────────────────────────────────────

type Source = "CSV" | "FINIO" | "TRANSACT";

interface ProviderDef {
  id:          Source;
  name:        string;
  tagline:     string;
  description: string;
  badge?:      string;
  logo:        React.ReactNode;
}

// Transact logo mark — green brand
function TransactMark() {
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect width="48" height="48" rx="10" fill="#00843D" />
        {/* Stylised "T" with upward arrow */}
        <path d="M12 16 H36 M24 16 V34" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 28 L24 34 L29 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// Finio logo mark — deep purple brand
function FinioMark() {
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect width="48" height="48" rx="10" fill="#4F46E5" />
        {/* "F" letterform */}
        <path d="M14 12 H34 M14 12 V36 M14 24 H28" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// Generic CSV logo mark — slate
function CsvMark() {
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect width="48" height="48" rx="10" fill="#475569" />
        {/* Document lines */}
        <path d="M16 10 H28 L38 20 V40 H16 V10Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M28 10 V20 H38" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 27 H32 M20 32 H28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

const PROVIDERS: ProviderDef[] = [
  {
    id:          "TRANSACT",
    name:        "Transact",
    tagline:     "Platform transactions",
    description: "Standard transaction exports from Transact. Trade Date, ISIN, Quantity and Price columns auto-detected.",
    badge:       "Most used",
    logo:        <TransactMark />,
  },
  {
    id:          "FINIO",
    name:        "Finio",
    tagline:     "Back-office exports",
    description: "Valuation and transaction exports from Finio adviser back-office. tradeDate / unitPrice format supported.",
    logo:        <FinioMark />,
  },
  {
    id:          "CSV",
    name:        "Generic CSV",
    tagline:     "Any CSV format",
    description: "Import any CSV with a header row. Use the column mapping tool to match your columns to the required fields.",
    logo:        <CsvMark />,
  },
];

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
  PENDING:    { label: "Pending",    icon: Clock,          classes: "text-slate-500 bg-slate-100"    },
  PROCESSING: { label: "Processing", icon: Clock,          classes: "text-blue-600 bg-blue-50"       },
  COMPLETED:  { label: "Completed",  icon: CheckCircle2,   classes: "text-emerald-600 bg-emerald-50" },
  FAILED:     { label: "Failed",     icon: XCircle,        classes: "text-rose-500 bg-rose-50"       },
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
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Job row ───────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: ImportJob }) {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = (job.error_log?.length ?? 0) > 0;
  const pct = job.rows_total > 0 ? Math.round((job.rows_processed / job.rows_total) * 100) : 0;

  const provider = PROVIDERS.find((p) => p.id === job.source);

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
          <span className="text-xs font-semibold text-slate-600">
            {provider?.name ?? job.source}
          </span>
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
  const [source,    setSource]    = useState<Source>("TRANSACT");
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

  const activeProvider = PROVIDERS.find((p) => p.id === source)!;

  return (
    <PageShell title="Import Data">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* ── Step 1: Provider selection ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#002147] text-white text-[10px] font-bold shrink-0">1</span>
            <h2 className="text-sm font-semibold text-[#0F172A]">Select data source</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => {
              const active = source === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSource(p.id)}
                  className={cn(
                    "relative text-left bg-white border rounded-xl p-5 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]",
                    active
                      ? "border-[#002147] ring-1 ring-[#002147]/20 shadow-md"
                      : "border-[#E2E8F0] hover:border-slate-300 hover:shadow"
                  )}
                >
                  {/* Most-used badge */}
                  {p.badge && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {p.badge}
                    </span>
                  )}

                  {/* Selected indicator */}
                  {active && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#002147] flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}

                  {/* Logo */}
                  <div className="mb-4">{p.logo}</div>

                  {/* Name + tagline */}
                  <p className="text-sm font-semibold text-[#0F172A] leading-tight">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 mb-2">{p.tagline}</p>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>

                  {/* Active bottom bar */}
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl bg-[#002147]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Step 2: Upload ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#002147] text-white text-[10px] font-bold shrink-0">2</span>
              <h2 className="text-sm font-semibold text-[#0F172A]">Upload file</h2>
            </div>
            {/* Active provider pill */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-500">Importing from</span>
              <span className="text-xs font-semibold text-[#002147]">{activeProvider.name}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          <div className="p-5 space-y-5">
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
                  <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center">
                    <Upload className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#0F172A]">
                      Drop a {activeProvider.name} CSV here
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">or click to browse your files</p>
                  </div>
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
                <ColumnMapper
                  headers={headers}
                  mapping={mapping}
                  onChange={(k, v) => setMapping((m) => ({ ...m, [k]: v || undefined }))}
                />
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
                className="min-w-40"
              >
                {isPending ? "Processing…" : file ? `Import from ${activeProvider.name}` : "Select a File First"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Import history ─────────────────────────────────────────────────── */}
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

        {/* ── Format guide ───────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-semibold text-[#0F172A]">Supported Export Formats</h2>
            <p className="text-xs text-slate-500 mt-0.5">Expected column names for auto-detection</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                provider: PROVIDERS[0], // Transact
                fields:   "Trade Date · Transaction Type · ISIN · Quantity · Price · Currency · Charges",
              },
              {
                provider: PROVIDERS[1], // Finio
                fields:   "tradeDate · txType · isin · units · unitPrice · currency · fees",
              },
              {
                provider: PROVIDERS[2], // CSV
                fields:   "date · type · isin · units · price · currency · fees · reference",
              },
            ].map(({ provider, fields }) => (
              <div key={provider.id} className="flex gap-3">
                <div className="shrink-0 scale-75 origin-top-left">{provider.logo}</div>
                <div className="pt-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0F172A] mb-0.5">{provider.name}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono break-words">{fields}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
