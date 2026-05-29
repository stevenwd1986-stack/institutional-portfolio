import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Minus, Lock, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn, fmtPct } from "../../lib/utils";
import { useConsolidatedPerformance } from "../../hooks/useConsolidatedPerformance";
import type { ReturnPeriod } from "../../hooks/useConsolidatedPerformance";

// ── Types ─────────────────────────────────────────────────────────────────────

const PERIODS: { key: ReturnPeriod; label: string; ann: boolean }[] = [
  { key: "1M",  label: "1 Month",  ann: false },
  { key: "6M",  label: "6 Months", ann: false },
  { key: "1Y",  label: "1 Year",   ann: false },
  { key: "3Y",  label: "3 Year",   ann: true  },
  { key: "5Y",  label: "5 Year",   ann: true  },
];

const WRAPPER_COLORS: Record<string, string> = {
  SIPP:          "text-[#002147]",
  ISA:           "text-emerald-700",
  GIA:           "text-slate-600",
  OFFSHORE_BOND: "text-violet-700",
  LISA:          "text-pink-700",
  JISA:          "text-blue-700",
};

// ── Main component ────────────────────────────────────────────────────────────

export function PerformancePeriodTable({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useConsolidatedPerformance(clientId);
  const [showClosed, setShowClosed] = useState(false);
  const [activeMetric, setActiveMetric] = useState<"twr" | "xirr">("twr");

  if (isLoading || !data) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-400">Loading performance data…</p>
      </div>
    );
  }

  const active = data.wrappers.filter((w) => !w.is_closed);
  const closed = data.wrappers.filter((w) => w.is_closed);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[#0F172A]">Returns by Period</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Time-weighted returns across all wrappers · Portfolio = AUM-weighted
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Metric toggle */}
          <div className="flex items-center gap-0.5 bg-[#F1F5F9] rounded-lg p-1">
            {(["twr", "xirr"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide transition-colors",
                  activeMetric === m
                    ? "bg-[#002147] text-white shadow-sm"
                    : "text-slate-500 hover:text-[#0F172A]"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {closed.length > 0 && (
            <button
              onClick={() => setShowClosed((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#002147] transition-colors"
            >
              <Lock className="w-3 h-3" />
              {showClosed ? "Hide" : "Show"} closed accounts
              {showClosed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide w-56">
                Account
              </th>
              {PERIODS.map((p) => (
                <th
                  key={p.key}
                  className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {p.label}
                  {p.ann && <span className="ml-0.5 opacity-60">(p.a.)</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Active wrappers ──────────────────────────────────────────── */}
            {active.map((w) => {
              const wrapperId = w.wrapper_id;
              return (
                <tr
                  key={w.wrapper_id}
                  className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          WRAPPER_COLORS[w.wrapper_type]?.replace("text-", "bg-") ?? "bg-slate-400"
                        )}
                        style={{ backgroundColor: undefined }}
                      />
                      <div>
                        <button
                          onClick={() => navigate(`/clients/${clientId}/wrappers/${wrapperId}`)}
                          className={cn(
                            "text-xs font-semibold hover:underline decoration-dotted underline-offset-2",
                            WRAPPER_COLORS[w.wrapper_type] ?? "text-slate-600"
                          )}
                        >
                          {w.wrapper_type.replace("_", " ")}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-0">{w.platform}</p>
                      </div>
                    </div>
                  </td>

                  {PERIODS.map((p) => {
                    const metrics = w.periods[p.key];
                    if (!metrics.available) {
                      return (
                        <td key={p.key} className="px-4 py-3 text-center">
                          <span className="text-slate-300 text-xs">—</span>
                        </td>
                      );
                    }
                    const rawVal  = activeMetric === "xirr" && metrics.xirr != null
                      ? metrics.xirr
                      : (p.ann ? metrics.twr_ann : metrics.twr);
                    const isPos   = rawVal >= 0;

                    return (
                      <td
                        key={p.key}
                        className={cn(
                          "px-4 py-3.5 text-right tabular-nums text-sm font-semibold",
                          activeMetric === "xirr" && metrics.xirr == null
                            ? "text-slate-300"
                            : isPos ? "text-emerald-600" : "text-rose-500"
                        )}
                      >
                        {activeMetric === "xirr" && metrics.xirr == null && p.key !== "1Y" && p.key !== "3Y" && p.key !== "5Y"
                          ? <Minus className="w-3 h-3 inline opacity-40" />
                          : fmtPct(rawVal, 1)
                        }
                        {p.ann && activeMetric !== "xirr" && (
                          <span className="text-[10px] font-normal ml-0.5 opacity-60">p.a.</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* ── Closed / transferred wrappers ────────────────────────────── */}
            {showClosed && closed.map((w) => (
              <tr
                key={w.wrapper_id}
                className="border-b border-[#E2E8F0] bg-[#F8FAFC] opacity-60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 line-through">
                        {w.wrapper_type.replace("_", " ")} — {w.platform}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0">
                        Transferred {w.closed_date ? new Date(w.closed_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : ""}
                        {w.transferred_to && ` → ${w.transferred_to}`}
                      </p>
                    </div>
                  </div>
                </td>
                {PERIODS.map((p) => {
                  const metrics = w.periods[p.key];
                  if (!metrics.available) {
                    return (
                      <td key={p.key} className="px-4 py-3 text-center">
                        <span className="text-slate-300 text-xs">—</span>
                      </td>
                    );
                  }
                  const val   = p.ann ? metrics.twr_ann : metrics.twr;
                  const isPos = val >= 0;
                  return (
                    <td
                      key={p.key}
                      className={cn(
                        "px-4 py-3 text-right tabular-nums text-sm font-medium",
                        isPos ? "text-emerald-600/60" : "text-rose-500/60"
                      )}
                    >
                      {fmtPct(val, 1)}
                      {p.ann && <span className="text-[10px] font-normal ml-0.5 opacity-60">p.a.</span>}
                      <span className="ml-1 text-[9px] text-slate-400">*</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* ── Portfolio total footer ────────────────────────────────────────── */}
          <tfoot>
            <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#002147] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">Portfolio Total</p>
                    <p className="text-[10px] text-slate-500">AUM-weighted · all wrappers</p>
                  </div>
                </div>
              </td>
              {PERIODS.map((p) => {
                const metrics = data.portfolio[p.key];
                const rawVal  = activeMetric === "xirr" && metrics.xirr != null
                  ? metrics.xirr
                  : (p.ann ? metrics.twr_ann : metrics.twr);
                const isPos   = rawVal >= 0;
                return (
                  <td
                    key={p.key}
                    className={cn(
                      "px-4 py-4 text-right tabular-nums text-base font-bold",
                      isPos ? "text-emerald-600" : "text-rose-500"
                    )}
                  >
                    {fmtPct(rawVal, 1)}
                    {p.ann && activeMetric !== "xirr" && (
                      <span className="text-[10px] font-normal ml-0.5 opacity-60">p.a.</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Footer note ───────────────────────────────────────────────────────── */}
      {(data.note || closed.length > 0) && (
        <div className="px-5 py-3 border-t border-[#E2E8F0] flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            {data.note}
            {closed.length > 0 && !showClosed && (
              <> · {closed.length} closed account{closed.length !== 1 ? "s" : ""} included in multi-year portfolio return.
              <button onClick={() => setShowClosed(true)} className="ml-1 text-slate-400 hover:text-[#002147] underline decoration-dotted">
                Show detail
              </button>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
