import { useState }       from "react";
import * as Dialog        from "@radix-ui/react-dialog";
import {
  Receipt, ChevronDown, ChevronRight, Pencil, X,
  AlertCircle, Loader2, PoundSterling, Percent, Info,
} from "lucide-react";
import { PageShell }          from "../components/shared/PageShell";
import { StatCard }           from "../components/shared/StatCard";
import {
  useCostsBreakdown,
  useUpdateAccountFees,
  type AccountCosts,
} from "../hooks/useCostsAndCharges";
import { cn, fmt, fmtCompact } from "../lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFee(pct: number | null): string {
  if (pct == null || pct === 0) return "—";
  return `${pct.toFixed(2)}%`;
}

function fmtFeePct(pct: number): string {
  if (pct === 0) return "—";
  return `${pct.toFixed(2)}%`;
}

const TYPE_LABEL: Record<string, string> = {
  etf:              "ETF",
  mutual_fund:      "Fund",
  investment_trust: "Trust",
  share:            "Share",
  cash:             "Cash",
  pension_fund:     "Pension",
  other:            "Other",
};

const WRAPPER_LABEL: Record<string, string> = {
  sipp:             "SIPP",
  isa:              "ISA",
  gia:              "GIA",
  lisa:             "LISA",
  jisa:             "JISA",
  sipp_drawdown:    "SIPP",
  offshore_bond:    "Bond",
  workplace_pension:"Pension",
};

// ─── Edit Fees Dialog ─────────────────────────────────────────────────────────

interface EditFeesDialogProps {
  account:  AccountCosts;
  open:     boolean;
  onClose:  () => void;
}

function EditFeesDialog({ account, open, onClose }: EditFeesDialogProps) {
  const [platformVal, setPlatformVal] = useState(
    account.platform_pct != null ? String(account.platform_pct) : ""
  );
  const [adviserVal, setAdviserVal] = useState(
    account.adviser_pct != null ? String(account.adviser_pct) : ""
  );
  const [dimVal, setDimVal] = useState(
    account.dim_pct != null ? String(account.dim_pct) : ""
  );

  const mutation = useUpdateAccountFees();

  function parseField(v: string): number | null {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const f = parseFloat(trimmed);
    return isNaN(f) ? null : f;
  }

  async function handleSave() {
    await mutation.mutateAsync({
      accountId:    account.account_id,
      platform_pct: parseField(platformVal),
      adviser_pct:  parseField(adviserVal),
      dim_pct:      parseField(dimVal),
    });
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <Dialog.Title className="text-sm font-semibold text-[#0F172A]">
                Edit Fee Rates
              </Dialog.Title>
              <Dialog.Description className="text-xs text-slate-500 mt-0.5">
                {account.account_name}
                {account.provider_name && (
                  <span className="text-slate-400"> · {account.provider_name}</span>
                )}
              </Dialog.Description>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors -mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <FeeField
              label="Platform / Scheme charge"
              hint="Annual charge from the platform or product provider"
              value={platformVal}
              onChange={setPlatformVal}
            />
            <FeeField
              label="Adviser charge"
              hint="Your ongoing service fee for this account"
              value={adviserVal}
              onChange={setAdviserVal}
            />
            <FeeField
              label="DIM fee"
              hint="Discretionary investment manager fee (if applicable)"
              value={dimVal}
              onChange={setDimVal}
            />
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Enter as a percentage, e.g. <span className="font-mono">0.75</span> = 0.75% p.a.
            OCF is read from instrument data and cannot be edited here.
          </p>

          {/* Actions */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-[#002147] text-sm font-medium text-white hover:bg-[#001530] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>

          {mutation.isError && (
            <p className="mt-3 text-xs text-rose-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Failed to save. Please try again.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FeeField({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0F172A] mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="5"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="w-full border border-[#E2E8F0] rounded-lg pl-3 pr-8 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#002147]/20 focus:border-[#002147] placeholder:text-slate-300"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

// ─── Holdings Table ───────────────────────────────────────────────────────────

function HoldingsTable({ account }: { account: AccountCosts }) {
  const sorted = [...account.holdings].sort((a, b) => b.value - a.value);
  return (
    <div className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
      <div className="px-4 py-2 border-b border-[#E2E8F0]">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Fund Holdings — OCF Breakdown
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#E2E8F0]">
            <th className="px-4 py-2 text-left font-medium text-slate-400 uppercase tracking-wide">Holding</th>
            <th className="px-4 py-2 text-center font-medium text-slate-400 uppercase tracking-wide">Type</th>
            <th className="px-4 py-2 text-right font-medium text-slate-400 uppercase tracking-wide">Value</th>
            <th className="px-4 py-2 text-right font-medium text-slate-400 uppercase tracking-wide">OCF %</th>
            <th className="px-4 py-2 text-right font-medium text-slate-400 uppercase tracking-wide">OCF p.a.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => (
            <tr key={h.instrument_id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-white transition-colors">
              <td className="px-4 py-2.5">
                <span className="text-[#0F172A] font-medium leading-snug">{h.name}</span>
                {h.isin && <span className="ml-1.5 text-slate-400 font-mono">{h.isin}</span>}
                {h.using_cost_basis && (
                  <span className="ml-1.5 text-amber-500" title="Using cost basis — no price available">*</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {TYPE_LABEL[h.instrument_type] ?? h.instrument_type}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right text-[#0F172A] tabular-nums font-medium">
                {h.value > 0 ? fmt(h.value) : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {h.ocf_pct != null ? (
                  <span className="text-[#0F172A]">{h.ocf_pct.toFixed(2)}%</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {h.annual_ocf_cost > 0 ? (
                  <span className="text-slate-600">{fmt(h.annual_ocf_cost)}</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.some((h) => h.using_cost_basis) && (
        <p className="px-4 py-2 text-xs text-amber-600 flex items-center gap-1.5 border-t border-[#E2E8F0]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          * Value shown at cost basis — live price not yet available for this holding.
        </p>
      )}
    </div>
  );
}

// ─── Account Row ──────────────────────────────────────────────────────────────

function AccountRow({ account }: { account: AccountCosts }) {
  const [expanded, setExpanded] = useState(false);
  const [editing,  setEditing]  = useState(false);

  const hasAnyFee =
    account.platform_pct != null ||
    account.adviser_pct  != null ||
    account.dim_pct      != null;

  return (
    <>
      <tr className={cn(
        "border-b border-[#E2E8F0] transition-colors",
        expanded ? "bg-[#F8FAFC]" : "hover:bg-[#F8FAFC]"
      )}>
        {/* Expand + Account name */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              {expanded
                ? <ChevronDown  className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
            <div>
              <span className="text-sm font-medium text-[#0F172A]">{account.account_name}</span>
              {account.provider_name && (
                <span className="ml-2 text-xs text-slate-400">{account.provider_name}</span>
              )}
            </div>
          </div>
        </td>

        {/* Wrapper type */}
        <td className="px-4 py-3.5">
          <span className="inline-flex items-center rounded-md bg-[#E8F0FE] px-2 py-0.5 text-xs font-medium text-[#002147]">
            {WRAPPER_LABEL[account.account_type] ?? account.account_type.toUpperCase()}
          </span>
        </td>

        {/* Value */}
        <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[#0F172A] text-sm">
          {account.total_value > 0 ? fmt(account.total_value) : <span className="text-slate-300">—</span>}
        </td>

        {/* Platform */}
        <td className="px-4 py-3.5 text-right tabular-nums text-sm text-slate-600">
          {fmtFee(account.platform_pct)}
        </td>

        {/* OCF (weighted) */}
        <td className="px-4 py-3.5 text-right tabular-nums text-sm text-slate-600">
          {account.weighted_ocf_pct > 0
            ? <span>{account.weighted_ocf_pct.toFixed(2)}%</span>
            : <span className="text-slate-300">—</span>}
        </td>

        {/* Adviser */}
        <td className="px-4 py-3.5 text-right tabular-nums text-sm text-slate-600">
          {fmtFee(account.adviser_pct)}
        </td>

        {/* DIM */}
        <td className="px-4 py-3.5 text-right tabular-nums text-sm text-slate-600">
          {fmtFee(account.dim_pct)}
        </td>

        {/* Total % */}
        <td className="px-4 py-3.5 text-right tabular-nums">
          {account.total_cost_pct > 0 ? (
            <span className={cn(
              "text-sm font-semibold",
              account.total_cost_pct > 2 ? "text-amber-600" : "text-[#0F172A]"
            )}>
              {fmtFeePct(account.total_cost_pct)}
            </span>
          ) : (
            <span className="text-sm text-slate-300">—</span>
          )}
        </td>

        {/* Annual cost £ */}
        <td className="px-4 py-3.5 text-right tabular-nums">
          {account.annual_total_cost > 0 ? (
            <span className="text-sm text-slate-600">{fmt(account.annual_total_cost)}</span>
          ) : (
            <span className="text-sm text-slate-300">—</span>
          )}
        </td>

        {/* Edit */}
        <td className="px-4 py-3.5 text-right">
          <button
            onClick={() => setEditing(true)}
            className={cn(
              "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors",
              hasAnyFee
                ? "text-[#002147] bg-[#E8F0FE] hover:bg-[#d4e4fe]"
                : "text-slate-500 bg-slate-100 hover:bg-slate-200"
            )}
          >
            <Pencil className="w-3 h-3" />
            {hasAnyFee ? "Edit" : "Set fees"}
          </button>
        </td>
      </tr>

      {/* Holdings drawer */}
      {expanded && (
        <tr>
          <td colSpan={10} className="p-0">
            <HoldingsTable account={account} />
          </td>
        </tr>
      )}

      {/* Edit dialog */}
      <EditFeesDialog
        account={account}
        open={editing}
        onClose={() => setEditing(false)}
      />
    </>
  );
}

// ─── Client Section ───────────────────────────────────────────────────────────

function ClientSection({ client }: { client: import("../hooks/useCostsAndCharges").ClientCosts }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      {/* Client header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#002147] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">
              {client.client_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">{client.client_name}</p>
            <p className="text-xs text-slate-400">{client.accounts.length} account{client.accounts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* AUM */}
          <div className="text-right">
            <p className="text-xs text-slate-400">Total AUM</p>
            <p className="text-sm font-semibold text-[#0F172A] tabular-nums">
              {fmtCompact(client.total_aum)}
            </p>
          </div>
          {/* OCF */}
          <div className="text-right">
            <p className="text-xs text-slate-400">Fund costs (OCF)</p>
            <p className="text-sm font-medium text-slate-600 tabular-nums">
              {fmt(client.annual_ocf_cost)} / yr
            </p>
          </div>
          {/* Total cost */}
          <div className="text-right">
            <p className="text-xs text-slate-400">Total annual cost</p>
            <p className={cn(
              "text-sm font-semibold tabular-nums",
              client.total_cost_pct > 2 ? "text-amber-600" : "text-[#0F172A]"
            )}>
              {fmt(client.annual_total_cost)}
              <span className="ml-1.5 font-normal text-slate-500">
                ({client.total_cost_pct > 0 ? `${client.total_cost_pct.toFixed(2)}%` : "—"})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Accounts table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {[
                { label: "Account",          align: "left"  },
                { label: "Type",             align: "left"  },
                { label: "Value",            align: "right" },
                { label: "Platform",         align: "right" },
                { label: "OCF (wtd.)",       align: "right" },
                { label: "Adviser",          align: "right" },
                { label: "DIM",              align: "right" },
                { label: "Total %",          align: "right" },
                { label: "Annual cost",      align: "right" },
                { label: "",                 align: "right" },
              ].map(({ label, align }) => (
                <th
                  key={label}
                  className={cn(
                    "px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap",
                    align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {client.accounts.map((account) => (
              <AccountRow key={account.account_id} account={account} />
            ))}
          </tbody>
          {/* Client total row */}
          {client.accounts.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-[#0F172A] tabular-nums">
                  {fmt(client.total_aum)}
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">
                  {client.total_aum > 0 && client.annual_platform_cost > 0
                    ? `${((client.annual_platform_cost / client.total_aum) * 100).toFixed(2)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">
                  {client.total_aum > 0 && client.annual_ocf_cost > 0
                    ? `${((client.annual_ocf_cost / client.total_aum) * 100).toFixed(2)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">
                  {client.total_aum > 0 && client.annual_adviser_cost > 0
                    ? `${((client.annual_adviser_cost / client.total_aum) * 100).toFixed(2)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">
                  {client.total_aum > 0 && client.annual_dim_cost > 0
                    ? `${((client.annual_dim_cost / client.total_aum) * 100).toFixed(2)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={cn(
                    "text-sm font-bold tabular-nums",
                    client.total_cost_pct > 2 ? "text-amber-600" : "text-[#0F172A]"
                  )}>
                    {client.total_cost_pct > 0 ? `${client.total_cost_pct.toFixed(2)}%` : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-[#0F172A] tabular-nums">
                  {client.annual_total_cost > 0 ? fmt(client.annual_total_cost) : "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#E8F0FE] flex items-center justify-center">
        <Receipt className="w-6 h-6 text-[#002147]" />
      </div>
      <p className="text-sm font-medium text-[#0F172A]">No holdings found</p>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
        Import transaction data to see a full costs & charges breakdown across your clients' portfolios.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CostsAndCharges() {
  const { data, isLoading, isError } = useCostsBreakdown();

  const totalAccounts = data?.clients.reduce((s, c) => s + c.accounts.length, 0) ?? 0;
  const anyFeesSet    = data?.clients.some((c) =>
    c.accounts.some((a) => a.platform_pct != null || a.adviser_pct != null || a.dim_pct != null)
  ) ?? false;

  return (
    <PageShell title="Costs & Charges">
      <div className="flex flex-col gap-6">

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total AUM"
            value={fmtCompact(data?.total_aum ?? 0)}
            subtext={fmt(data?.total_aum ?? 0)}
            icon={<PoundSterling className="w-4 h-4" />}
          />
          <StatCard
            label="Total Annual Cost"
            value={fmt(data?.annual_total_cost ?? 0)}
            subtext="across all clients"
            icon={<Receipt className="w-4 h-4" />}
          />
          <StatCard
            label="Avg Cost Ratio"
            value={
              (data?.total_cost_pct ?? 0) > 0
                ? `${data!.total_cost_pct.toFixed(2)}%`
                : "—"
            }
            subtext="total cost of ownership"
            valueClass={
              (data?.total_cost_pct ?? 0) > 2
                ? "text-amber-600"
                : (data?.total_cost_pct ?? 0) > 0
                ? "text-[#0F172A]"
                : "text-slate-400"
            }
            icon={<Percent className="w-4 h-4" />}
          />
          <StatCard
            label="Accounts"
            value={String(totalAccounts)}
            subtext={`${data?.clients.length ?? 0} client${(data?.clients.length ?? 0) !== 1 ? "s" : ""}`}
            icon={<Receipt className="w-4 h-4" />}
          />
        </div>

        {/* ── Fee basis banner ── */}
        {!isLoading && !isError && (data?.clients.length ?? 0) > 0 && !anyFeesSet && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">Fee rates not yet configured.</span>{" "}
              Platform charges, adviser fees and DIM fees show as "—" until you set them.
              Click <strong>Set fees</strong> on any account row to add rates.
              OCF is sourced automatically from instrument data.
            </p>
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading costs breakdown…</span>
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-700">Failed to load costs data. Check your connection and try again.</p>
          </div>
        )}

        {/* ── No data ── */}
        {!isLoading && !isError && (data?.clients.length ?? 0) === 0 && (
          <EmptyState />
        )}

        {/* ── Client sections ── */}
        {!isLoading && (data?.clients ?? []).map((client) => (
          <ClientSection key={client.client_id} client={client} />
        ))}

        {/* ── Disclosure footer ── */}
        {!isLoading && (data?.clients.length ?? 0) > 0 && (
          <p className="text-xs text-slate-400 leading-relaxed border-t border-[#E2E8F0] pt-4">
            <span className="font-medium text-slate-500">Costs & Charges disclosure</span> — Annual costs are estimated based on current holdings values and the fee percentages entered above.
            OCF (Ongoing Charges Figure) is sourced from instrument data and is an indicative annualised figure.
            Where live pricing is unavailable, cost basis is used as the valuation base (*).
            These figures are for internal oversight purposes and should be verified before use in client-facing disclosure documents (FCA COBS 6.1ZA / MiFID II).
          </p>
        )}
      </div>
    </PageShell>
  );
}
