import { useState }        from "react";
import { useTransactions }  from "../../hooks/useTransactions";
import { cn, fmt }          from "../../lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TX_LABEL: Record<string, string> = {
  BUY:                     "Buy",
  SELL:                    "Sell",
  DIVIDEND:                "Dividend",
  INTEREST:                "Interest",
  FEE:                     "Fee",
  TAX:                     "Tax",
  TRANSFER_IN_SPECIE:      "Transfer In (Specie)",
  TRANSFER_OUT_SPECIE:     "Transfer Out (Specie)",
  TRANSFER_IN_CASH:        "Transfer In (Cash)",
  TRANSFER_OUT_CASH:       "Transfer Out (Cash)",
  CORPORATE_ACTION_SPLIT:  "Stock Split",
  CORPORATE_ACTION_MERGE:  "Merger",
  CONTRIBUTION:            "Contribution",
  WITHDRAWAL:              "Withdrawal",
  BENEFIT_CRYSTALLISATION: "Crystallisation",
};

const TX_COLOR: Record<string, string> = {
  BUY:                    "text-[#002147]",
  SELL:                   "text-rose-500",
  DIVIDEND:               "text-emerald-600",
  INTEREST:               "text-emerald-600",
  FEE:                    "text-amber-600",
  TAX:                    "text-amber-600",
  CONTRIBUTION:           "text-blue-600",
  WITHDRAWAL:             "text-orange-600",
  TRANSFER_IN_SPECIE:     "text-violet-600",
  TRANSFER_OUT_SPECIE:    "text-violet-600",
  TRANSFER_IN_CASH:       "text-violet-600",
  TRANSFER_OUT_CASH:      "text-violet-600",
  BENEFIT_CRYSTALLISATION:"text-pink-600",
};

const PAGE_SIZE = 10;

export function TransactionHistory({ clientId }: { clientId: string }) {
  const [page, setPage] = useState(0);
  const { data } = useTransactions(clientId, page, PAGE_SIZE);

  const transactions = data?.transactions ?? [];
  const total        = data?.total ?? 0;
  const totalPages   = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0]">
        <h2 className="text-sm font-semibold text-[#0F172A]">Transaction History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {["Date", "Type", "Asset", "Units", "Price", "Amount", "Fees", ""].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap",
                    h === "Date" || h === "Type" || h === "Asset" || h === "" ? "text-left" : "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
              >
                <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                  {new Date(tx.trade_date).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className={cn("text-xs font-medium", TX_COLOR[tx.transaction_type] ?? "text-slate-500")}>
                    {TX_LABEL[tx.transaction_type] ?? tx.transaction_type}
                  </span>
                </td>
                <td className="px-4 py-3.5 max-w-[180px]">
                  <p className="text-xs text-[#0F172A] truncate">{tx.asset_name}</p>
                  {tx.isin && <p className="text-xs text-slate-400 font-mono">{tx.isin}</p>}
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {tx.units != null
                    ? tx.units.toLocaleString("en-GB", { maximumFractionDigits: 0 })
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {tx.price != null ? fmt(tx.price) : <span className="text-slate-300">—</span>}
                </td>
                <td className={cn(
                  "px-4 py-3.5 text-right text-sm font-semibold tabular-nums whitespace-nowrap",
                  tx.net_amount >= 0 ? "text-emerald-600" : "text-rose-500"
                )}>
                  {tx.net_amount >= 0 ? "+" : ""}{fmt(Math.abs(tx.net_amount))}
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-400 tabular-nums whitespace-nowrap">
                  {tx.fees > 0 ? fmt(tx.fees) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3.5 text-left pl-2">
                  {tx.is_book_over && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                      Book-over
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0]">
        <span className="text-xs text-slate-500">{total} transactions</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded text-slate-400 hover:text-[#002147] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 tabular-nums">
            {page + 1} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) >= totalPages}
            className="p-1.5 rounded text-slate-400 hover:text-[#002147] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
