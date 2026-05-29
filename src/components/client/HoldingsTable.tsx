import React, { useState } from "react";
import { useHoldings }  from "../../hooks/useHoldings";
import { cn, fmt } from "../../lib/utils";
import { ChevronDown }  from "lucide-react";

const WRAPPER_COLOR: Record<string, string> = {
  SIPP:          "text-[#002147]  bg-[#E8F0FE]   border-[#002147]/20",
  ISA:           "text-emerald-700 bg-emerald-50  border-emerald-200",
  GIA:           "text-slate-600  bg-[#F1F5F9]   border-[#E2E8F0]",
  OFFSHORE_BOND: "text-violet-700 bg-violet-50    border-violet-200",
};

const CLASS_COLOR: Record<string, string> = {
  EQUITY:       "text-blue-600",
  FIXED_INCOME: "text-amber-600",
  CASH:         "text-slate-500",
  ALTERNATIVES: "text-purple-600",
  PROPERTY:     "text-orange-600",
};

export function HoldingsTable({ clientId }: { clientId: string }) {
  const { data: holdings = [] } = useHoldings(clientId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const totalValue = holdings.reduce((s, h) => s + h.market_value, 0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F172A]">Holdings</h2>
        <span className="text-xs text-slate-500">{holdings.length} positions</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="w-8"></th>
              {["Asset", "Wrapper", "Units", "Price", "Value", "Cost", "Gain / Loss", "%"].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap",
                    i === 0 ? "text-left" : "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const isExpanded = expanded.has(h.id);
              return (
                <React.Fragment key={h.id}>
                  <tr
                    onClick={() => toggleRow(h.id)}
                    className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="pl-3 pr-0 py-3.5">
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-slate-400 transition-transform",
                        isExpanded && "rotate-180"
                      )} />
                    </td>
                    <td className="px-4 py-3.5 text-left max-w-[200px]">
                      <p className="text-sm text-[#0F172A] font-medium truncate">{h.asset_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {h.isin && <span className="text-xs text-slate-400 font-mono">{h.isin}</span>}
                        <span className={cn("text-xs font-medium", CLASS_COLOR[h.asset_class] ?? "text-slate-500")}>
                          {h.asset_class.replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border",
                        WRAPPER_COLOR[h.wrapper_type] ?? WRAPPER_COLOR.GIA
                      )}>
                        {h.wrapper_type === "OFFSHORE_BOND" ? "Bond" : h.wrapper_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                      {h.units.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                      {fmt(h.price)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] font-medium tabular-nums">
                      {fmt(h.market_value)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                      {fmt(h.cost_basis)}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-right text-sm font-semibold tabular-nums",
                      h.unrealised_gain >= 0 ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {h.unrealised_gain >= 0 ? "+" : ""}{fmt(h.unrealised_gain)}
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-right text-xs font-semibold tabular-nums",
                      h.pct_gain >= 0 ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {h.pct_gain >= 0 ? "+" : ""}{(h.pct_gain * 100).toFixed(1)}%
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <td colSpan={9} className="px-8 py-3">
                        <div className="grid grid-cols-3 gap-6 text-xs">
                          <div>
                            <span className="text-slate-500">ISIN</span>
                            <p className="text-[#0F172A] font-mono mt-0.5">{h.isin ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Market value</span>
                            <p className="text-[#0F172A] font-medium mt-0.5">{fmt(h.market_value)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">% of portfolio</span>
                            <p className="text-[#0F172A] font-medium mt-0.5">
                              {totalValue > 0 ? ((h.market_value / totalValue) * 100).toFixed(1) : "—"}%
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <td colSpan={5} className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">
                Total
              </td>
              <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] tabular-nums">
                {fmt(totalValue)}
              </td>
              <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                {fmt(holdings.reduce((s, h) => s + h.cost_basis, 0))}
              </td>
              <td className={cn(
                "px-4 py-3.5 text-right text-sm font-bold tabular-nums",
                holdings.reduce((s, h) => s + h.unrealised_gain, 0) >= 0 ? "text-emerald-600" : "text-rose-500"
              )}>
                {fmt(holdings.reduce((s, h) => s + h.unrealised_gain, 0))}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
