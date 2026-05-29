import { useBondTransactions }  from "../../hooks/useWrapperTransactions";
import type { BondTransaction } from "../../hooks/useWrapperTransactions";
import { fmt }   from "../../lib/utils";
import { cn }    from "../../lib/utils";
import { PlusCircle, ArrowDownCircle, Layers, TrendingDown } from "lucide-react";

const TX_CONFIG = {
  PREMIUM: {
    label:  "Premium",
    icon:   PlusCircle,
    bg:     "bg-emerald-50 border-emerald-200 text-emerald-700",
    dotBg:  "bg-emerald-500",
  },
  WITHDRAWAL: {
    label:  "Withdrawal",
    icon:   ArrowDownCircle,
    bg:     "bg-amber-50 border-amber-200 text-amber-700",
    dotBg:  "bg-amber-500",
  },
  SEGMENT_ENCASHMENT: {
    label:  "Encashment",
    icon:   Layers,
    bg:     "bg-violet-50 border-violet-200 text-violet-700",
    dotBg:  "bg-violet-500",
  },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function TxRow({ tx, isLast }: { tx: BondTransaction; isLast: boolean }) {
  const cfg    = TX_CONFIG[tx.type];
  const Icon   = cfg.icon;

  const cashAmt =
    tx.type === "PREMIUM"            ? tx.premium_amount ?? 0 :
    tx.type === "WITHDRAWAL"         ? -(tx.withdrawal_amount ?? 0) :
    -(tx.value_received ?? 0);

  return (
    <div className="flex items-start gap-4">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center border", cfg.bg)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#E2E8F0] mt-1 min-h-[2rem]" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", cfg.bg)}>
                {cfg.label}
              </span>
              {tx.type === "WITHDRAWAL" && !tx.within_allowance && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-1">
                  <TrendingDown className="w-2.5 h-2.5" /> Chargeable Event
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">{tx.description}</p>
            <p className="text-xs text-slate-400 mt-0.5">{fmtDate(tx.date)}</p>
          </div>

          <div className="text-right shrink-0">
            <p className={cn(
              "text-sm font-bold tabular-nums",
              cashAmt >= 0 ? "text-emerald-600" : "text-[#0F172A]"
            )}>
              {cashAmt >= 0 ? "+" : ""}{fmt(Math.abs(cashAmt))}
            </p>
            {tx.chargeable_gain != null && tx.chargeable_gain > 0 && (
              <p className="text-xs text-violet-600 tabular-nums mt-0.5">
                Gain: {fmt(tx.chargeable_gain)}
              </p>
            )}
            {tx.excess_amount != null && tx.excess_amount > 0 && (
              <p className="text-xs text-rose-500 tabular-nums mt-0.5">
                Excess: {fmt(tx.excess_amount)}
              </p>
            )}
          </div>
        </div>

        {/* Running metrics strip */}
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[
            { label: "Cost basis",    value: fmt(tx.running_cost_basis),       dim: false },
            { label: "Segments",      value: String(tx.running_segments),       dim: false },
            { label: "5% allowance",  value: fmt(tx.running_annual_allowance) + " /yr", dim: false },
            { label: "Allow. used",   value: fmt(tx.running_allowance_used),    dim: tx.running_allowance_used === 0 },
          ].map(({ label, value, dim }) => (
            <div key={label} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-2">
              <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={cn("text-xs font-semibold tabular-nums mt-0.5", dim ? "text-slate-400" : "text-[#0F172A]")}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BondLedger({ wrapperId, yearsHeld }: { wrapperId: string; yearsHeld: number }) {
  const { data: txns = [], isLoading } = useBondTransactions(wrapperId, yearsHeld);

  const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Bond Transaction Ledger</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Running impact on cost basis, segments &amp; 5% allowance
          </p>
        </div>
        <span className="text-xs text-slate-400">{txns.length} transaction{txns.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="px-5 py-5">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-6">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No transactions recorded yet.</p>
        ) : (
          <div>
            {sorted.map((tx, i) => (
              <TxRow key={tx.id} tx={tx} isLast={i === sorted.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {txns.length > 0 && (() => {
        const latest = [...txns].sort((a, b) => b.date.localeCompare(a.date))[0];
        return (
          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 grid grid-cols-4 gap-4">
            {[
              { label: "Cost Basis",     value: fmt(latest.running_cost_basis)       },
              { label: "Segments",       value: `${latest.running_segments} remaining` },
              { label: "5% Allowance",   value: `${fmt(latest.running_annual_allowance)} /yr` },
              { label: "Allowance Used", value: fmt(latest.running_allowance_used)   },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-[#0F172A] mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
