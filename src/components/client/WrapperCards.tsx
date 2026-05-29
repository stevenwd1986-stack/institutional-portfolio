import { useNavigate }  from "react-router-dom";
import { useWrappers }  from "../../hooks/useWrappers";
import { fmt, fmtPct }  from "../../lib/utils";
import { cn }           from "../../lib/utils";
import { ChevronRight, Archive, Layers, FileText } from "lucide-react";
import type { WrapperSummary } from "../../hooks/useWrappers";

// ── Platform logo marks ───────────────────────────────────────────────────────

function TransactLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="shrink-0">
      <rect width="48" height="48" rx="10" fill="#00843D" />
      <path d="M12 16 H36 M24 16 V34" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 28 L24 34 L29 28" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FinioLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="shrink-0">
      <rect width="48" height="48" rx="10" fill="#4F46E5" />
      <path d="M14 12 H34 M14 12 V36 M14 24 H28" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GenericPlatformLogo({ size = 18 }: { size?: number }) {
  return (
    <span
      className="shrink-0 rounded-md bg-slate-400 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <FileText className="text-white" style={{ width: size * 0.6, height: size * 0.6 }} />
    </span>
  );
}

function PlatformLogo({ platform, size = 18 }: { platform: string; size?: number }) {
  const p = platform.toUpperCase();
  if (p.includes("TRANSACT")) return <TransactLogo size={size} />;
  if (p.includes("FINIO"))    return <FinioLogo    size={size} />;
  return <GenericPlatformLogo size={size} />;
}

// ── Style config — light palette ──────────────────────────────────────────────

const WRAPPER_STYLE: Record<string, { label: string; accent: string; bg: string; bar: string; dot: string }> = {
  SIPP:          { label: "SIPP",          accent: "text-[#002147]",    bg: "bg-[#E8F0FE]    border-[#002147]/15",  bar: "bg-[#002147]",   dot: "bg-[#002147]"   },
  ISA:           { label: "ISA",           accent: "text-emerald-700",  bg: "bg-emerald-50   border-emerald-200",   bar: "bg-emerald-500", dot: "bg-emerald-500" },
  GIA:           { label: "GIA",           accent: "text-slate-600",    bg: "bg-[#F1F5F9]    border-[#E2E8F0]",     bar: "bg-slate-400",   dot: "bg-slate-400"   },
  OFFSHORE_BOND: { label: "Offshore Bond", accent: "text-violet-700",   bg: "bg-violet-50    border-violet-200",    bar: "bg-violet-500",  dot: "bg-violet-500"  },
  LISA:          { label: "LISA",          accent: "text-pink-700",     bg: "bg-pink-50      border-pink-200",      bar: "bg-pink-500",    dot: "bg-pink-500"    },
  JISA:          { label: "JISA",          accent: "text-blue-700",     bg: "bg-blue-50      border-blue-200",      bar: "bg-blue-500",    dot: "bg-blue-500"    },
};

// ── Sub-account chips ─────────────────────────────────────────────────────────

function SubAccountChips({ wrapper }: { wrapper: WrapperSummary }) {
  const { sub_accounts } = wrapper;
  if (!sub_accounts || sub_accounts.length <= 1) return null;

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {sub_accounts.map((sa) => (
        <span
          key={sa.id}
          className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-white/60 border border-[#E2E8F0] rounded-md px-1.5 py-0.5"
        >
          <Layers className="w-2.5 h-2.5 opacity-60 shrink-0" />
          <span className="truncate max-w-[110px]">{sa.name}</span>
          <span className="text-slate-400 tabular-nums">{fmt(sa.value)}</span>
        </span>
      ))}
    </div>
  );
}

// ── Single wrapper card ───────────────────────────────────────────────────────

function WrapperCard({ w, clientId }: { w: WrapperSummary; clientId: string }) {
  const navigate = useNavigate();
  const style    = WRAPPER_STYLE[w.wrapper_type] ?? WRAPPER_STYLE.GIA;
  const gain     = w.value - w.cost_basis;
  const gainPct  = w.cost_basis > 0 ? gain / w.cost_basis : 0;
  const fillPct  = w.contributions_total > 0
    ? Math.min(100, (w.value / (w.contributions_total * 1.5)) * 100) : 50;

  if (w.is_closed) {
    return (
      <div className="border rounded-xl p-4 opacity-50 bg-[#F8FAFC] border-[#E2E8F0]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Archive className="w-3 h-3" />
            {style.label}
          </span>
          <span className="text-[10px] text-slate-500 bg-[#F1F5F9] px-1.5 py-0.5 rounded">Closed</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <PlatformLogo platform={w.platform} size={14} />
          <p className="text-xs font-medium text-slate-500">{w.platform}</p>
        </div>
        {w.transfer_note && (
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{w.transfer_note}</p>
        )}
        {w.closed_date && (
          <p className="text-[10px] text-slate-400 mt-1">
            {new Date(w.closed_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate(`/clients/${clientId}/wrappers/${w.id}`)}
      className={cn(
        "border rounded-xl p-4 text-left transition-all group w-full",
        "hover:ring-1 hover:ring-[#002147]/20 hover:shadow-md hover:-translate-y-0.5",
        style.bg
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn("text-xs font-bold uppercase tracking-wide", style.accent)}>
          {style.label}
        </span>

        {/* Platform badge with logo */}
        <div className="flex items-center gap-1.5 bg-white/70 border border-[#E2E8F0] rounded-lg px-2 py-1 shadow-sm">
          <PlatformLogo platform={w.platform} size={14} />
          <span className="text-[11px] font-medium text-slate-600">{w.platform}</span>
          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-[#002147] transition-colors" />
        </div>
      </div>

      <p className="text-xl font-semibold text-[#0F172A] tracking-tight">
        {fmt(w.value)}
      </p>

      {/* Value bar */}
      <div className="mt-3 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${fillPct}%` }} />
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Cost basis</span>
          <span className="text-slate-600 tabular-nums">{fmt(w.cost_basis)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Unrealised</span>
          <span className={cn("tabular-nums font-medium", gain >= 0 ? "text-emerald-600" : "text-rose-500")}>
            {gain >= 0 ? "+" : ""}{fmt(gain)}
            <span className="ml-1 opacity-70">({fmtPct(gainPct)})</span>
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">1Y return</span>
          <span className={cn("tabular-nums font-semibold", w.performance_1y >= 0 ? "text-emerald-600" : "text-rose-500")}>
            {fmtPct(w.performance_1y)}
          </span>
        </div>
      </div>

      {/* Sub-account chips */}
      <SubAccountChips wrapper={w} />

      <p className={cn("mt-2.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity", style.accent)}>
        View tax analysis →
      </p>
    </button>
  );
}

// ── Platform group ────────────────────────────────────────────────────────────

function PlatformGroup({
  platform, wrappers, clientId,
}: {
  platform:  string;
  wrappers:  WrapperSummary[];
  clientId:  string;
}) {
  const total     = wrappers.filter((w) => !w.is_closed).reduce((s, w) => s + w.value, 0);
  const hasClosed = wrappers.some((w) => w.is_closed);

  return (
    <div>
      {/* Platform group header with logo */}
      <div className="flex items-center gap-2.5 mb-3">
        <PlatformLogo platform={platform} size={20} />
        <span className="text-sm font-semibold text-[#0F172A]">{platform}</span>
        {total > 0 && (
          <span className="text-xs text-slate-500 tabular-nums font-medium">{fmt(total)}</span>
        )}
        {hasClosed && (
          <span className="text-[10px] text-slate-500 bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">incl. closed</span>
        )}
        <div className="flex-1 h-px bg-[#E2E8F0]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {wrappers.map((w) => (
          <WrapperCard key={w.id} w={w} clientId={clientId} />
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function WrapperCards({ clientId }: { clientId: string }) {
  const { data: wrappers = [] } = useWrappers(clientId);

  const groups = new Map<string, WrapperSummary[]>();
  for (const w of wrappers) {
    if (!groups.has(w.platform)) groups.set(w.platform, []);
    groups.get(w.platform)!.push(w);
  }

  const singlePlatform = groups.size === 1;

  if (singlePlatform) {
    // Still show the platform header even when single platform
    const [[platform, ws]] = [...groups.entries()];
    return (
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <PlatformLogo platform={platform} size={20} />
          <span className="text-sm font-semibold text-[#0F172A]">{platform}</span>
          <span className="text-xs text-slate-500 tabular-nums font-medium">
            {fmt(ws.filter((w) => !w.is_closed).reduce((s, w) => s + w.value, 0))}
          </span>
          <div className="flex-1 h-px bg-[#E2E8F0]" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {wrappers.map((w) => <WrapperCard key={w.id} w={w} clientId={clientId} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([platform, ws]) => (
        <PlatformGroup key={platform} platform={platform} wrappers={ws} clientId={clientId} />
      ))}
    </div>
  );
}
