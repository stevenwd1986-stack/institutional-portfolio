import { useEffect, useState } from "react";
import { X, Save, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "../../hooks/useTransactions";
import type { TransactionRow, TransactionInput, TxType } from "../../hooks/useTransactions";
import { useWrappers } from "../../hooks/useWrappers";

// ── Transaction type config ───────────────────────────────────────────────────

interface TxDef {
  label:      string;
  sign:       "positive" | "negative" | "either";
  needsAsset: boolean;
  needsUnits: boolean;
  color:      string;
  group:      string;
}

const TX_DEFS: Record<TxType, TxDef> = {
  CASH_IN:       { label: "Cash In",        sign: "positive", needsAsset: false, needsUnits: false, color: "text-emerald-700 bg-emerald-50 border-emerald-200",  group: "Cash"     },
  CASH_OUT:      { label: "Cash Out",       sign: "negative", needsAsset: false, needsUnits: false, color: "text-rose-700    bg-rose-50    border-rose-200",     group: "Cash"     },
  WITHDRAWAL:    { label: "Withdrawal",     sign: "negative", needsAsset: false, needsUnits: false, color: "text-orange-700  bg-orange-50  border-orange-200",   group: "Cash"     },
  TAX_RELIEF:    { label: "Tax Relief",     sign: "positive", needsAsset: false, needsUnits: false, color: "text-blue-700    bg-blue-50    border-blue-200",     group: "Tax"      },
  FEE:           { label: "Fee",            sign: "negative", needsAsset: false, needsUnits: false, color: "text-amber-700   bg-amber-50   border-amber-200",    group: "Tax"      },
  DIVIDEND:      { label: "Dividend",       sign: "positive", needsAsset: true,  needsUnits: false, color: "text-emerald-700 bg-emerald-50 border-emerald-200",  group: "Income"   },
  INTEREST:      { label: "Interest",       sign: "positive", needsAsset: false, needsUnits: false, color: "text-emerald-700 bg-emerald-50 border-emerald-200",  group: "Income"   },
  IN_SPECIE_IN:  { label: "In-Specie In",   sign: "positive", needsAsset: true,  needsUnits: true,  color: "text-violet-700  bg-violet-50  border-violet-200",   group: "Transfer" },
  IN_SPECIE_OUT: { label: "In-Specie Out",  sign: "negative", needsAsset: true,  needsUnits: true,  color: "text-violet-700  bg-violet-50  border-violet-200",   group: "Transfer" },
  // Legacy types — kept for existing data, not shown in "add" picker
  BUY:                     { label: "Buy",               sign: "positive", needsAsset: true,  needsUnits: true,  color: "text-[#002147]   bg-[#E8F0FE]  border-[#002147]/20", group: "Trade" },
  SELL:                    { label: "Sell",              sign: "negative", needsAsset: true,  needsUnits: true,  color: "text-rose-700    bg-rose-50    border-rose-200",     group: "Trade" },
  CONTRIBUTION:            { label: "Contribution",      sign: "positive", needsAsset: false, needsUnits: false, color: "text-blue-700    bg-blue-50    border-blue-200",     group: "Cash"  },
  TRANSFER_IN_SPECIE:      { label: "Transfer In (Specie)",  sign: "positive", needsAsset: true, needsUnits: true, color: "text-violet-700 bg-violet-50 border-violet-200",  group: "Transfer" },
  TRANSFER_OUT_SPECIE:     { label: "Transfer Out (Specie)", sign: "negative", needsAsset: true, needsUnits: true, color: "text-violet-700 bg-violet-50 border-violet-200",  group: "Transfer" },
  TRANSFER_IN_CASH:        { label: "Transfer In (Cash)",    sign: "positive", needsAsset: false, needsUnits: false, color: "text-violet-700 bg-violet-50 border-violet-200", group: "Transfer" },
  TRANSFER_OUT_CASH:       { label: "Transfer Out (Cash)",   sign: "negative", needsAsset: false, needsUnits: false, color: "text-violet-700 bg-violet-50 border-violet-200", group: "Transfer" },
  BENEFIT_CRYSTALLISATION: { label: "Crystallisation",    sign: "either",   needsAsset: false, needsUnits: false, color: "text-pink-700    bg-pink-50    border-pink-200",    group: "Tax"   },
  CORPORATE_ACTION_SPLIT:  { label: "Stock Split",        sign: "either",   needsAsset: true,  needsUnits: true,  color: "text-slate-600   bg-slate-50   border-slate-200",   group: "Trade" },
  CORPORATE_ACTION_MERGE:  { label: "Merger",             sign: "either",   needsAsset: true,  needsUnits: true,  color: "text-slate-600   bg-slate-50   border-slate-200",   group: "Trade" },
  TAX:                     { label: "Tax",                sign: "negative", needsAsset: false, needsUnits: false, color: "text-amber-700   bg-amber-50   border-amber-200",   group: "Tax"   },
};

// Types shown in the "add new" picker
const ADDABLE_TYPES: TxType[] = [
  "CASH_IN", "CASH_OUT", "WITHDRAWAL",
  "TAX_RELIEF", "FEE",
  "DIVIDEND", "INTEREST",
  "IN_SPECIE_IN", "IN_SPECIE_OUT",
];

const GROUPS = ["Cash", "Income", "Tax", "Transfer"] as const;

// ── Blank form ────────────────────────────────────────────────────────────────

function blankForm(type: TxType = "CASH_IN", wrapperId = ""): TransactionInput {
  return {
    wrapper_id:       wrapperId,
    transaction_type: type,
    trade_date:       new Date().toISOString().slice(0, 10),
    asset_name:       "",
    isin:             "",
    units:            "",
    price:            "",
    net_amount:       "",
    fees:             "",
    notes:            "",
  };
}

function rowToForm(row: TransactionRow): TransactionInput {
  return {
    wrapper_id:       row.wrapper_id,
    transaction_type: row.transaction_type,
    trade_date:       row.trade_date,
    asset_name:       row.asset_name,
    isin:             row.isin ?? "",
    units:            row.units != null ? String(row.units) : "",
    price:            row.price != null ? String(row.price) : "",
    net_amount:       String(Math.abs(row.net_amount)),
    fees:             row.fees > 0 ? String(row.fees) : "",
    notes:            row.notes,
  };
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#002147] focus:border-[#002147] placeholder:text-slate-400";

// ── Main drawer ───────────────────────────────────────────────────────────────

interface Props {
  clientId:         string;
  editRow:          TransactionRow | null;   // null = add mode
  defaultWrapperId?: string;
  onClose:          () => void;
}

const WRAPPER_TYPE_LABEL: Record<string, string> = {
  SIPP: "SIPP", ISA: "ISA", GIA: "GIA",
  OFFSHORE_BOND: "Offshore Bond", LISA: "LISA", JISA: "JISA",
};

export function TransactionFormDrawer({ clientId, editRow, defaultWrapperId, onClose }: Props) {
  const isEdit = editRow !== null;
  const { data: wrappers = [] } = useWrappers(clientId);
  const activeWrappers = wrappers.filter((w) => !w.is_closed);

  const [form,         setForm]         = useState<TransactionInput>(() =>
    isEdit ? rowToForm(editRow) : blankForm("CASH_IN", defaultWrapperId ?? activeWrappers[0]?.id ?? "")
  );
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [errors,       setErrors]       = useState<Partial<Record<keyof TransactionInput, string>>>({});

  const addTx    = useAddTransaction(clientId);
  const updateTx = useUpdateTransaction(clientId);
  const deleteTx = useDeleteTransaction(clientId);

  const isPending = addTx.isPending || updateTx.isPending || deleteTx.isPending;

  // Re-populate form when editRow changes
  useEffect(() => {
    setForm(isEdit ? rowToForm(editRow) : blankForm());
    setErrors({});
    setConfirmDel(false);
  }, [editRow]);

  function set(field: keyof TransactionInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // When type changes, auto-flip sign of amount for display
  function setType(type: TxType) {
    setForm((f) => ({ ...f, transaction_type: type, asset_name: "", isin: "", units: "", price: "" }));
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.wrapper_id)   errs.wrapper_id   = "Required";
    if (!form.trade_date)   errs.trade_date   = "Required";
    if (!form.net_amount || isNaN(parseFloat(form.net_amount))) errs.net_amount = "Enter a valid amount";

    const def = TX_DEFS[form.transaction_type];
    if (def.needsAsset && !form.asset_name.trim()) errs.asset_name = "Required for this type";
    if (def.needsUnits && !form.units.trim())      errs.units      = "Required for this type";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    // Apply sign convention
    const def    = TX_DEFS[form.transaction_type];
    const rawAmt = parseFloat(form.net_amount);
    const signed: TransactionInput = {
      ...form,
      net_amount: String(def.sign === "negative" ? -Math.abs(rawAmt) : Math.abs(rawAmt)),
    };

    if (isEdit) {
      await updateTx.mutateAsync({ id: editRow.id, input: signed });
    } else {
      await addTx.mutateAsync(signed);
    }
    onClose();
  }

  async function handleDelete() {
    if (!isEdit) return;
    await deleteTx.mutateAsync(editRow.id);
    onClose();
  }

  const def = TX_DEFS[form.transaction_type];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white border-l border-[#E2E8F0] shadow-xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">
              {isEdit ? "Edit Transaction" : "Add Transaction"}
            </h2>
            {isEdit && (
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(editRow.trade_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-[#002147] hover:bg-[#F8FAFC] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* ── Account selector ─────────────────────────────────────────────── */}
          <Field label="Account" required>
            <select
              value={form.wrapper_id}
              onChange={(e) => set("wrapper_id", e.target.value)}
              className={cn(inputCls, !form.wrapper_id && "border-rose-300")}
            >
              <option value="">— select account —</option>
              {activeWrappers.map((w) => (
                <option key={w.id} value={w.id}>
                  {WRAPPER_TYPE_LABEL[w.wrapper_type] ?? w.wrapper_type} — {w.platform}
                </option>
              ))}
            </select>
          </Field>

          <div className="h-px bg-[#E2E8F0]" />

          {/* ── Transaction type picker ──────────────────────────────────────── */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Transaction type</p>
            <div className="space-y-2">
              {GROUPS.map((group) => {
                const groupTypes = ADDABLE_TYPES.filter((t) => TX_DEFS[t].group === group);
                if (groupTypes.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupTypes.map((t) => {
                        const d       = TX_DEFS[t];
                        const active  = form.transaction_type === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setType(t)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                              active
                                ? d.color
                                : "text-slate-500 border-[#E2E8F0] bg-white hover:border-slate-300"
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Show legacy type chip when editing an imported transaction */}
              {isEdit && !ADDABLE_TYPES.includes(form.transaction_type) && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Imported type</p>
                  <span className={cn("inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border", def.color)}>
                    {def.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-[#E2E8F0]" />

          {/* ── Date ─────────────────────────────────────────────────────────── */}
          <Field label="Date" required>
            <input
              type="date"
              value={form.trade_date}
              onChange={(e) => set("trade_date", e.target.value)}
              className={cn(inputCls, errors.trade_date && "border-rose-300 ring-1 ring-rose-300")}
            />
            {errors.trade_date && <p className="text-xs text-rose-500 mt-1">{errors.trade_date}</p>}
          </Field>

          {/* ── Asset name + ISIN ─────────────────────────────────────────────── */}
          {(def.needsAsset || form.transaction_type === "DIVIDEND") && (
            <Field label="Asset / Fund name" required={def.needsAsset}>
              <input
                type="text"
                placeholder="e.g. iShares Core MSCI World ETF"
                value={form.asset_name}
                onChange={(e) => set("asset_name", e.target.value)}
                className={cn(inputCls, errors.asset_name && "border-rose-300 ring-1 ring-rose-300")}
              />
              {errors.asset_name && <p className="text-xs text-rose-500 mt-1">{errors.asset_name}</p>}
            </Field>
          )}

          {def.needsAsset && (
            <Field label="ISIN">
              <input
                type="text"
                placeholder="e.g. IE00B4L5Y983"
                value={form.isin}
                onChange={(e) => set("isin", e.target.value.toUpperCase())}
                className={cn(inputCls, "font-mono tracking-wide uppercase")}
                maxLength={12}
              />
            </Field>
          )}

          {/* ── Description (non-asset types) ────────────────────────────────── */}
          {!def.needsAsset && (
            <Field label="Description">
              <input
                type="text"
                placeholder={
                  form.transaction_type === "CASH_IN"    ? "e.g. Monthly contribution" :
                  form.transaction_type === "CASH_OUT"   ? "e.g. Ad-hoc withdrawal" :
                  form.transaction_type === "WITHDRAWAL" ? "e.g. Income drawdown" :
                  form.transaction_type === "TAX_RELIEF" ? "e.g. HMRC basic rate tax relief" :
                  form.transaction_type === "FEE"        ? "e.g. Platform fee Q2 2026" :
                  form.transaction_type === "INTEREST"   ? "e.g. Cash account interest" :
                  "Description"
                }
                value={form.asset_name}
                onChange={(e) => set("asset_name", e.target.value)}
                className={inputCls}
              />
            </Field>
          )}

          {/* ── Units + Price (in-specie / trade types) ───────────────────────── */}
          {def.needsUnits && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Units" required>
                <input
                  type="number"
                  placeholder="0"
                  value={form.units}
                  onChange={(e) => {
                    set("units", e.target.value);
                    // Auto-calculate amount from units × price
                    const u = parseFloat(e.target.value);
                    const p = parseFloat(form.price);
                    if (!isNaN(u) && !isNaN(p)) set("net_amount", String(u * p));
                  }}
                  className={cn(inputCls, errors.units && "border-rose-300 ring-1 ring-rose-300")}
                />
                {errors.units && <p className="text-xs text-rose-500 mt-1">{errors.units}</p>}
              </Field>
              <Field label="Price per unit (£)">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => {
                    set("price", e.target.value);
                    const u = parseFloat(form.units);
                    const p = parseFloat(e.target.value);
                    if (!isNaN(u) && !isNaN(p)) set("net_amount", String(u * p));
                  }}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* ── Amount ───────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={def.sign === "negative" ? "Amount (£) deducted" : "Amount (£) received"} required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.net_amount}
                  onChange={(e) => set("net_amount", e.target.value)}
                  className={cn(inputCls, "pl-6", errors.net_amount && "border-rose-300 ring-1 ring-rose-300")}
                />
              </div>
              {errors.net_amount && <p className="text-xs text-rose-500 mt-1">{errors.net_amount}</p>}
            </Field>
            <Field label="Fees (£)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.fees}
                  onChange={(e) => set("fees", e.target.value)}
                  className={cn(inputCls, "pl-6")}
                />
              </div>
            </Field>
          </div>

          {/* ── Notes ────────────────────────────────────────────────────────── */}
          <Field label="Notes">
            <textarea
              rows={3}
              placeholder="Optional notes or reference"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={cn(inputCls, "resize-none")}
            />
          </Field>

          {/* ── Delete confirmation ───────────────────────────────────────────── */}
          {confirmDel && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 font-medium leading-relaxed">
                  Delete this transaction? This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-5 py-4 border-t border-[#E2E8F0] shrink-0 flex gap-2",
          isEdit ? "justify-between" : "justify-end"
        )}>
          {isEdit && !confirmDel && (
            <button
              onClick={() => setConfirmDel(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          {confirmDel && <div />}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#002147] hover:bg-[#001530] rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add transaction"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
