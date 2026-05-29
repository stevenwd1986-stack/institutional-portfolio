import { useState }                    from "react";
import { useTransactions }             from "../../hooks/useTransactions";
import type { TransactionRow, TxType } from "../../hooks/useTransactions";
import { TransactionFormDrawer }       from "./TransactionFormDrawer";
import { cn, fmt }                     from "../../lib/utils";
import { ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";

// ── Display config ────────────────────────────────────────────────────────────

const TX_LABEL: Partial<Record<TxType, string>> = {
  CASH_IN:                 "Cash In",
  CASH_OUT:                "Cash Out",
  IN_SPECIE_IN:            "In-Specie In",
  IN_SPECIE_OUT:           "In-Specie Out",
  WITHDRAWAL:              "Withdrawal",
  TAX_RELIEF:              "Tax Relief",
  FEE:                     "Fee",
  DIVIDEND:                "Dividend",
  INTEREST:                "Interest",
  BUY:                     "Buy",
  SELL:                    "Sell",
  CONTRIBUTION:            "Contribution",
  TRANSFER_IN_SPECIE:      "Transfer In (Specie)",
  TRANSFER_OUT_SPECIE:     "Transfer Out (Specie)",
  TRANSFER_IN_CASH:        "Transfer In (Cash)",
  TRANSFER_OUT_CASH:       "Transfer Out (Cash)",
  BENEFIT_CRYSTALLISATION: "Crystallisation",
  CORPORATE_ACTION_SPLIT:  "Stock Split",
  CORPORATE_ACTION_MERGE:  "Merger",
  TAX:                     "Tax",
};

const TX_COLOR: Partial<Record<TxType, string>> = {
  CASH_IN:                 "text-emerald-600",
  CASH_OUT:                "text-rose-500",
  IN_SPECIE_IN:            "text-violet-600",
  IN_SPECIE_OUT:           "text-violet-600",
  WITHDRAWAL:              "text-orange-600",
  TAX_RELIEF:              "text-blue-600",
  FEE:                     "text-amber-600",
  DIVIDEND:                "text-emerald-600",
  INTEREST:                "text-emerald-600",
  BUY:                     "text-[#002147]",
  SELL:                    "text-rose-500",
  CONTRIBUTION:            "text-blue-600",
  TRANSFER_IN_SPECIE:      "text-violet-600",
  TRANSFER_OUT_SPECIE:     "text-violet-600",
  TRANSFER_IN_CASH:        "text-violet-600",
  TRANSFER_OUT_CASH:       "text-violet-600",
  BENEFIT_CRYSTALLISATION: "text-pink-600",
  TAX:                     "text-amber-600",
};

const PAGE_SIZE = 10;

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionHistory({ clientId }: { clientId: string }) {
  const [page,    setPage]    = useState(0);
  const [drawerRow, setDrawerRow] = useState<TransactionRow | null | "new">(undefined as unknown as null);
  const { data } = useTransactions(clientId, page, PAGE_SIZE);

  const transactions = data?.transactions ?? [];
  const total        = data?.total        ?? 0;
  const totalPages   = Math.ceil(total / PAGE_SIZE);

  const drawerOpen = drawerRow !== undefined && drawerRow !== (undefined as unknown as null);

  function openAdd() { setDrawerRow("new"); }
  function openEdit(row: TransactionRow) { setDrawerRow(row); }
  function closeDrawer() { setDrawerRow(undefined as unknown as null); }

  return (
    <>
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">Transaction History</h2>
            <p className="text-xs text-slate-500 mt-0.5">{total} transactions</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#002147] hover:bg-[#001530] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add transaction
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                {["Date", "Type", "Asset / Description", "Units", "Price", "Amount", "Fees", ""].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap",
                      h === "Date" || h === "Type" || h === "Asset / Description" || h === "" ? "text-left" : "text-right"
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
                  className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors group"
                >
                  <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(tx.trade_date).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={cn("text-xs font-medium", TX_COLOR[tx.transaction_type as TxType] ?? "text-slate-500")}>
                      {TX_LABEL[tx.transaction_type as TxType] ?? tx.transaction_type}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 max-w-[200px]">
                    <p className="text-xs text-[#0F172A] truncate">{tx.asset_name}</p>
                    {tx.isin && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.isin}</p>}
                    {tx.notes && <p className="text-[10px] text-slate-400 mt-0.5 truncate italic">{tx.notes}</p>}
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

                  {/* Tags + edit button */}
                  <td className="px-3 py-3.5 text-left">
                    <div className="flex items-center gap-2">
                      {tx.is_book_over && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                          Book-over
                        </span>
                      )}
                      <button
                        onClick={() => openEdit(tx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-[#002147] hover:bg-[#E8F0FE]"
                        title="Edit transaction"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    No transactions yet.{" "}
                    <button onClick={openAdd} className="text-[#002147] hover:underline font-medium">
                      Add the first one
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E2E8F0]">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded text-slate-400 hover:text-[#002147] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) >= totalPages}
              className="p-1.5 rounded text-slate-400 hover:text-[#002147] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <TransactionFormDrawer
          clientId={clientId}
          editRow={drawerRow === "new" ? null : drawerRow as TransactionRow}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
