import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Shield, Info, AlertTriangle, CheckCircle2, Clock, PlusCircle } from "lucide-react";
import { PageShell }                  from "../components/shared/PageShell";
import { PlatformLogo, FundManagerLogo } from "../components/shared/PlatformLogo";
import { useWrapper }                 from "../hooks/useWrapper";
import { useClient }                  from "../hooks/useClient";
import { fmt, fmtPct, fmtPrice }      from "../lib/utils";
import { cn }                         from "../lib/utils";
import { AddTransactionDrawer }       from "../components/client/AddTransactionDrawer";
import type { BondContext }           from "../components/client/AddTransactionDrawer";
import { BondLedger }                 from "../components/client/BondLedger";
import { AccountTransactionDrawer }   from "../components/client/AccountTransactionDrawer";
import { useBondTransactions }        from "../hooks/useWrapperTransactions";
import type {
  GIATaxDetails, OffshoresBondTaxDetails, SIPPTaxDetails, ISATaxDetails, TaxDetails, HoldingDetail,
} from "../hooks/useWrapper";

// ── Wrapper metadata ──────────────────────────────────────────────────────────

const WRAPPER_META = {
  SIPP: {
    label: "SIPP", fullName: "Self-Invested Personal Pension",
    accent: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200",
    treatmentIcon: Shield,
    treatmentType: "pension" as const,
    treatmentText: "Contributions attract income tax relief at your marginal rate. All growth inside the wrapper is free from UK tax. Benefits are taxable as income on withdrawal.",
  },
  ISA: {
    label: "ISA", fullName: "Individual Savings Account",
    accent: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",
    treatmentIcon: CheckCircle2,
    treatmentType: "exempt" as const,
    treatmentText: "All income and gains are completely free from UK Income Tax and Capital Gains Tax — now and in the future. Withdrawals are also tax-free.",
  },
  GIA: {
    label: "GIA", fullName: "General Investment Account",
    accent: "text-slate-600", bg: "bg-slate-100", border: "border-slate-300",
    treatmentIcon: AlertTriangle,
    treatmentType: "taxable" as const,
    treatmentText: "No tax shelter. Gains above the £3,000 annual CGT exemption are taxed at 20% (basic rate) or 24% (higher rate). Income from dividends and interest is subject to income tax.",
  },
  OFFSHORE_BOND: {
    label: "Offshore Bond", fullName: "Offshore Investment Bond",
    accent: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200",
    treatmentIcon: Clock,
    treatmentType: "deferred" as const,
    treatmentText: "5% of total premiums can be withdrawn each policy year tax-deferred (cumulative if unused). Full surrender is a chargeable event — gain assessed as income in the tax year of encashment. Top-slicing relief may reduce higher-rate liability.",
  },
} as const;

const TREATMENT_STYLE = {
  pension:  "bg-amber-50   border-amber-200   text-amber-700",
  exempt:   "bg-emerald-50 border-emerald-200 text-emerald-700",
  taxable:  "bg-amber-50   border-amber-200   text-amber-700",
  deferred: "bg-violet-50  border-violet-200  text-violet-700",
};

// ── Holdings table ────────────────────────────────────────────────────────────

const ASSET_CLASS_COLOR: Record<string, string> = {
  EQUITY:       "text-blue-600",
  FIXED_INCOME: "text-amber-600",
  CASH:         "text-slate-500",
  ALTERNATIVES: "text-purple-600",
  MIXED:        "text-[#002147]",
};

function HoldingsTable({ holdings }: { holdings: HoldingDetail[] }) {
  const total            = holdings.reduce((s, h) => s + h.market_value,    0);
  const totalCost        = holdings.reduce((s, h) => s + h.cost_basis,      0);
  const totalUnrealised  = holdings.reduce((s, h) => s + h.unrealised_gain, 0);
  const totalRealised    = holdings.reduce((s, h) => s + h.realised_gain,   0);
  const totalPct         = totalCost > 0 ? totalUnrealised / totalCost : 0;

  const headers = ["Asset", "Class", "Units", "Price", "Value", "Cost", "Unrealised G/L", "Realised G/L", "% Return", "IRR"];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">Holdings</h3>
        <span className="text-xs text-slate-400">{holdings.length} position{holdings.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {headers.map((h, i) => (
                <th key={h} className={cn(
                  "px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap",
                  i === 0 ? "text-left" : "text-right"
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3.5 text-left">
                  <div className="flex items-center gap-2.5">
                    <FundManagerLogo name={h.asset_name} size={20} />
                    <div className="min-w-0">
                      <p className="text-sm text-[#0F172A] font-medium truncate">{h.asset_name}</p>
                      {h.isin && <p className="text-xs text-slate-400 font-mono mt-0.5">{h.isin}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className={cn("text-xs font-medium", ASSET_CLASS_COLOR[h.asset_class] ?? "text-slate-500")}>
                    {h.asset_class.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                  {h.units.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                  {fmtPrice(h.price)}
                </td>
                <td className="px-4 py-3.5 text-right text-sm text-[#0F172A] font-semibold tabular-nums">
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
                  "px-4 py-3.5 text-right text-sm font-semibold tabular-nums",
                  h.realised_gain > 0 ? "text-emerald-600" : h.realised_gain < 0 ? "text-rose-500" : "text-slate-300"
                )}>
                  {h.realised_gain === 0 ? "—" : <>{h.realised_gain > 0 ? "+" : ""}{fmt(h.realised_gain)}</>}
                </td>
                <td className={cn(
                  "px-4 py-3.5 text-right text-xs font-semibold tabular-nums",
                  h.pct_gain >= 0 ? "text-emerald-600" : "text-rose-500"
                )}>
                  {h.pct_gain >= 0 ? "+" : ""}{(h.pct_gain * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-300 tabular-nums">—</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
              <td colSpan={4} className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</td>
              <td className="px-4 py-3.5 text-right text-sm font-bold text-[#0F172A] tabular-nums">{fmt(total)}</td>
              <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">{fmt(totalCost)}</td>
              <td className={cn("px-4 py-3.5 text-right text-sm font-bold tabular-nums", totalUnrealised >= 0 ? "text-emerald-600" : "text-rose-500")}>
                {totalUnrealised >= 0 ? "+" : ""}{fmt(totalUnrealised)}
              </td>
              <td className={cn("px-4 py-3.5 text-right text-sm font-bold tabular-nums", totalRealised > 0 ? "text-emerald-600" : totalRealised < 0 ? "text-rose-500" : "text-slate-300")}>
                {totalRealised === 0 ? "—" : <>{totalRealised > 0 ? "+" : ""}{fmt(totalRealised)}</>}
              </td>
              <td className={cn("px-4 py-3.5 text-right text-xs font-bold tabular-nums", totalPct >= 0 ? "text-emerald-600" : "text-rose-500")}>
                {totalPct >= 0 ? "+" : ""}{(totalPct * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3.5 text-right text-xs text-slate-300">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Tax analysis panels ───────────────────────────────────────────────────────

function TaxRow({ label, value, highlight, sub }: { label: string; value: string; highlight?: "warning" | "positive" | "neutral"; sub?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between py-2", sub && "pl-3 opacity-80")}>
      <span className={cn("text-xs", sub ? "text-slate-500" : "text-slate-500")}>{label}</span>
      <span className={cn(
        "text-xs font-semibold tabular-nums",
        highlight === "warning"  ? "text-amber-600" :
        highlight === "positive" ? "text-emerald-600" :
        "text-[#0F172A]"
      )}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#E2E8F0] my-1" />;
}

function PlanningTip({ text }: { text: string }) {
  return (
    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3 flex items-start gap-2.5">
      <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-700 leading-relaxed">{text}</p>
    </div>
  );
}

const CARD = "bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm";
const CARD_HEADER = "px-5 py-4 border-b border-[#E2E8F0]";

function GIAPanel({ tax }: { tax: GIATaxDetails }) {
  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <h3 className="text-sm font-semibold text-[#0F172A]">CGT Position</h3>
        <p className="text-xs text-slate-500 mt-0.5">2024/25 tax year</p>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
        <div className="md:pr-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">CGT Summary</p>
          <TaxRow label="Total unrealised gains"   value={fmt(tax.unrealised_gains)} />
          <TaxRow label="CGT annual exempt amount" value={`−${fmt(tax.cgt_annual_exempt)}`} sub />
          <Divider />
          <TaxRow label="Net taxable gains"        value={fmt(tax.taxable_gains)} highlight="warning" />
        </div>
        <div className="pt-4 md:pt-0 md:px-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estimated Tax</p>
          <TaxRow label="At 20% (basic rate)"  value={fmt(tax.tax_basic)} sub />
          <TaxRow label="At 24% (higher rate)" value={fmt(tax.tax_higher)} sub highlight="warning" />
        </div>
        <div className="pt-4 md:pt-0 md:pl-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Gain by Position</p>
          {tax.position_gains.map((p) => (
            <div key={p.name} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-500 truncate max-w-[200px]">{p.name}</span>
              <div className="text-right shrink-0 ml-2">
                <span className="text-xs font-semibold text-emerald-600 tabular-nums">+{fmt(p.gain)}</span>
                <span className="text-xs text-slate-400 ml-2 tabular-nums">{((p.gain / p.cost) * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
          <PlanningTip text={`£${tax.cgt_annual_exempt.toLocaleString()} of gains can be crystallised free of CGT. Consider bed & ISA or bed & SIPP to shelter future gains from further growth.`} />
        </div>
      </div>
    </div>
  );
}

function OffshoresBondPanel({ tax }: { tax: OffshoresBondTaxDetails }) {
  const surrenderToday = tax.chargeable_event_gain;
  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <h3 className="text-sm font-semibold text-[#0F172A]">Chargeable Event Analysis</h3>
        <p className="text-xs text-slate-500 mt-0.5">RL360 policy — held {tax.years_held} years</p>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
        <div className="md:pr-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Bond Summary</p>
          <TaxRow label="Total premiums paid"    value={fmt(tax.total_premiums)} />
          <TaxRow label="Current surrender value" value={fmt(tax.total_premiums + surrenderToday)} />
          <Divider />
          <TaxRow label="Chargeable event gain"  value={fmt(surrenderToday)} highlight="warning" />
        </div>
        <div className="pt-4 md:pt-0 md:px-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">5% Withdrawal Allowance</p>
          <TaxRow label="Annual allowance (5% of premiums)" value={fmt(tax.annual_allowance_5pct) + " /yr"} />
          <TaxRow label={`Cumulative (${tax.years_held} yrs)`} value={fmt(tax.cumulative_allowance)} sub />
          <TaxRow label="Withdrawn to date"     value={fmt(tax.allowance_used)}     sub />
          <TaxRow label="Available to withdraw" value={fmt(tax.allowance_remaining)} highlight="positive" />
        </div>
        <div className="pt-4 md:pt-0 md:pl-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Top-Slicing Relief</p>
          <TaxRow label="Years held"             value={String(tax.years_held)} />
          <TaxRow label="Top-sliced gain / year" value={fmt(tax.top_sliced_gain)} sub />
          <PlanningTip text={`Top-slicing divides the gain (£${surrenderToday.toLocaleString()}) by ${tax.years_held} years, giving £${tax.top_sliced_gain.toLocaleString()} per year. This may keep the gain within the basic-rate band on surrender.`} />
        </div>
      </div>
    </div>
  );
}

function SIPPPanel({ tax }: { tax: SIPPTaxDetails }) {
  const pcls_pct = tax.uncrystallised > 0 ? (tax.pcls_available / tax.uncrystallised) * 100 : 0;
  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <h3 className="text-sm font-semibold text-[#0F172A]">Pension Position</h3>
        <p className="text-xs text-slate-500 mt-0.5">2024/25 tax year</p>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
        <div className="md:pr-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Fund Summary</p>
          <TaxRow label="Uncrystallised funds" value={fmt(tax.uncrystallised)} />
          <TaxRow label="In drawdown"          value={fmt(tax.drawdown)} sub />
        </div>
        <div className="pt-4 md:pt-0 md:px-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Annual Allowance</p>
          <TaxRow label="Allowance (2024/25)" value={fmt(tax.annual_allowance)} />
          <TaxRow label="Used this year"      value={fmt(tax.allowance_used)}      sub highlight={tax.allowance_used >= tax.annual_allowance ? "warning" : "neutral"} />
          <TaxRow label="Remaining"           value={fmt(tax.allowance_remaining)} sub highlight={tax.allowance_remaining > 0 ? "positive" : "warning"} />
          <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (tax.allowance_used / tax.annual_allowance) * 100)}%` }} />
          </div>
          {tax.allowance_remaining > 0 && (
            <PlanningTip text={`£${tax.allowance_remaining.toLocaleString()} annual allowance remains. Additional contributions attract income tax relief and grow sheltered inside the pension.`} />
          )}
        </div>
        <div className="pt-4 md:pt-0 md:pl-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pension Commencement Lump Sum</p>
          <TaxRow label="PCLS available (est.)" value={fmt(tax.pcls_available)} highlight="positive" />
          <TaxRow label={`Tax-free (${pcls_pct.toFixed(0)}% of uncrystallised)`} value="Tax-free cash" sub />
          {tax.pcls_available === tax.pcls_max && (
            <TaxRow label="Capped at standard PCLS limit" value="£268,275" sub highlight="warning" />
          )}
        </div>
      </div>
    </div>
  );
}

function ISAPanel({ tax }: { tax: ISATaxDetails }) {
  const usedPct = (tax.current_year_subscription / tax.subscription_limit) * 100;
  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <h3 className="text-sm font-semibold text-[#0F172A]">ISA Position</h3>
        <p className="text-xs text-slate-500 mt-0.5">2024/25 tax year</p>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
        <div className="md:pr-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Lifetime Summary</p>
          <TaxRow label="Total subscribed (lifetime)" value={fmt(tax.total_subscribed)} />
          <TaxRow label="Tax-free growth"              value={"+" + fmt(tax.tax_free_growth)} highlight="positive" />
        </div>
        <div className="pt-4 md:pt-0 md:px-6 pb-4 md:pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">2024/25 Subscription</p>
          <TaxRow label="Subscribed this year" value={fmt(tax.current_year_subscription)} />
          <TaxRow label="Annual limit"          value={fmt(tax.subscription_limit)} sub />
          <TaxRow label="Remaining allowance"   value={fmt(tax.subscription_remaining)} highlight={tax.subscription_remaining > 0 ? "positive" : "neutral"} />
          <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, usedPct)}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right tabular-nums">{usedPct.toFixed(0)}% used</p>
        </div>
        <div className="pt-4 md:pt-0 md:pl-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tax Treatment</p>
          <div className="flex items-start gap-2 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700 leading-relaxed">
              All income and capital gains within this ISA are permanently free from UK Income Tax and CGT — on withdrawal as well as inside the wrapper.
            </p>
          </div>
          {tax.subscription_remaining > 0 && (
            <PlanningTip text={`£${tax.subscription_remaining.toLocaleString()} ISA allowance remains this tax year. Consider topping up to shelter additional growth, particularly for holdings in the GIA where CGT may apply.`} />
          )}
        </div>
      </div>
    </div>
  );
}

function TaxPanel({ tax }: { tax: TaxDetails }) {
  if (tax.type === "GIA")           return <GIAPanel           tax={tax} />;
  if (tax.type === "OFFSHORE_BOND") return <OffshoresBondPanel tax={tax} />;
  if (tax.type === "SIPP")          return <SIPPPanel          tax={tax} />;
  return                                   <ISAPanel           tax={tax as ISATaxDetails} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WrapperDetail() {
  const { clientId, wrapperId } = useParams<{ clientId: string; wrapperId: string }>();
  const navigate                = useNavigate();
  const { data: wrapper }       = useWrapper(clientId!, wrapperId!);
  const { data: client }        = useClient(clientId!);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const yearsHeld = wrapper?.wrapper_type === "OFFSHORE_BOND"
    ? (wrapper.tax as OffshoresBondTaxDetails).years_held
    : 8;
  const { data: bondTxns = [] } = useBondTransactions(wrapperId!, yearsHeld);

  if (!wrapper) return null;

  const meta             = WRAPPER_META[wrapper.wrapper_type] ?? WRAPPER_META.GIA;
  const totalGain        = wrapper.value - wrapper.cost_basis;
  const totalGainPct     = wrapper.cost_basis > 0 ? totalGain / wrapper.cost_basis : 0;
  const TreatmentIcon    = meta.treatmentIcon;
  const isOffshoresBond  = wrapper.wrapper_type === "OFFSHORE_BOND";
  const offTax           = isOffshoresBond ? (wrapper.tax as OffshoresBondTaxDetails) : null;

  const latestTx = bondTxns.length > 0
    ? [...bondTxns].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const bondCtx: BondContext | null = isOffshoresBond && offTax ? {
    total_premiums:       latestTx?.running_premiums         ?? offTax.total_premiums,
    segments_remaining:   latestTx?.running_segments         ?? 100,
    cost_per_segment:     latestTx
      ? latestTx.running_cost_basis / Math.max(1, latestTx.running_segments)
      : offTax.total_premiums / 100,
    value_per_segment:    wrapper.value / Math.max(1, latestTx?.running_segments ?? 100),
    cumulative_allowance: latestTx?.running_cumul_allowance  ?? offTax.cumulative_allowance,
    allowance_used:       latestTx?.running_allowance_used   ?? offTax.allowance_used,
    annual_allowance:     latestTx?.running_annual_allowance ?? offTax.annual_allowance_5pct,
    years_held:           offTax.years_held,
    current_value:        wrapper.value,
    running_cost_basis:   latestTx?.running_cost_basis       ?? offTax.total_premiums,
  } : null;

  // Add Transaction button style per wrapper type
  const addTxClass = isOffshoresBond
    ? "bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100"
    : wrapper.wrapper_type === "ISA"
    ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
    : wrapper.wrapper_type === "GIA"
    ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
    : "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100";

  return (
    <PageShell>
      <div className="flex flex-col gap-5 max-w-7xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(`/clients/${clientId}`)}
                className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {client && (
                    <button
                      onClick={() => navigate(`/clients/${clientId}`)}
                      className="text-sm text-slate-500 hover:text-[#0F172A] transition-colors"
                    >
                      {client.firstName} {client.lastName}
                    </button>
                  )}
                  <span className="text-slate-300">/</span>
                  <span className={cn("text-sm font-semibold px-2.5 py-0.5 rounded-full border", meta.accent, meta.bg, meta.border)}>
                    {meta.label}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <PlatformLogo platform={wrapper.platform} size={16} />
                    {wrapper.platform}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{meta.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:flex-row shrink-0">
              <button
                onClick={() => setDrawerOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  addTxClass
                )}
              >
                <PlusCircle className="w-4 h-4" />
                Add Transaction
              </button>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">Market Value</p>
                <p className="text-2xl font-semibold text-[#0F172A] tracking-tight">{fmt(wrapper.value)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">Unrealised G/L</p>
                <p className={cn("text-lg font-semibold tabular-nums", totalGain >= 0 ? "text-emerald-600" : "text-rose-500")}>
                  {totalGain >= 0 ? "+" : ""}{fmt(totalGain)}
                  <span className="text-sm ml-1 opacity-70">({fmtPct(totalGainPct)})</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tax treatment banner ─────────────────────────────────────────── */}
        <div className={cn("border rounded-xl px-5 py-4 flex items-start gap-3", TREATMENT_STYLE[meta.treatmentType])}>
          <TreatmentIcon className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">{meta.treatmentText}</p>
        </div>

        {/* ── Performance metrics row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Time-Weighted Return", value: fmtPct(wrapper.twr),          positive: wrapper.twr  >= 0 },
            { label: "XIRR",                 value: fmtPct(wrapper.xirr),         positive: wrapper.xirr >= 0 },
            { label: "CAGR",                 value: fmtPct(wrapper.cagr),         positive: wrapper.cagr >= 0 },
            { label: "1Y Return",            value: fmtPct(wrapper.performance_1y), positive: wrapper.performance_1y >= 0 },
          ].map(({ label, value, positive }) => (
            <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
              <div className={cn("mt-2 flex items-center gap-1.5", positive ? "text-emerald-600" : "text-rose-500")}>
                {positive
                  ? <TrendingUp   className="w-4 h-4 shrink-0" />
                  : <TrendingDown className="w-4 h-4 shrink-0" />}
                <span className="text-2xl font-semibold tracking-tight">{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Holdings ─────────────────────────────────────────────────────── */}
        <HoldingsTable holdings={wrapper.holdings} />

        {/* ── Tax analysis ─────────────────────────────────────────────────── */}
        <TaxPanel tax={wrapper.tax} />

        {/* ── Bond Transaction Ledger (OFFSHORE_BOND only) ─────────────────── */}
        {isOffshoresBond && offTax && (
          <BondLedger wrapperId={wrapperId!} yearsHeld={offTax.years_held} />
        )}

      </div>

      {/* ── Add Transaction Drawers ───────────────────────────────────────────── */}
      {isOffshoresBond && bondCtx && (
        <AddTransactionDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          wrapperId={wrapperId!}
          bondCtx={bondCtx}
        />
      )}

      {(wrapper.wrapper_type === "ISA" || wrapper.wrapper_type === "GIA" || wrapper.wrapper_type === "SIPP") && (() => {
        const isaTax  = wrapper.tax.type === "ISA"  ? (wrapper.tax as ISATaxDetails)  : null;
        const giaTax  = wrapper.tax.type === "GIA"  ? (wrapper.tax as GIATaxDetails)  : null;
        const sippTax = wrapper.tax.type === "SIPP" ? (wrapper.tax as SIPPTaxDetails) : null;

        return (
          <AccountTransactionDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            wrapperId={wrapperId!}
            wrapperKind={wrapper.wrapper_type as "ISA" | "GIA" | "SIPP"}
            platform={wrapper.platform}
            isaCtx={isaTax ? {
              subscription_limit:     20_000,
              subscribed_this_year:   isaTax.current_year_subscription,
              subscription_remaining: isaTax.subscription_remaining,
              is_flexible:            false,
              aps_available:          undefined,
            } : undefined}
            giaCtx={giaTax ? {
              cgt_annual_exempt:   3_000,
              gains_realised_ytd:  giaTax.taxable_gains,
              losses_realised_ytd: 0,
              net_gains_ytd:       giaTax.taxable_gains,
            } : undefined}
            sippCtx={sippTax ? {
              annual_allowance:   sippTax.annual_allowance,
              aa_used:            sippTax.allowance_used,
              aa_remaining:       sippTax.allowance_remaining,
              uncrystallised:     sippTax.uncrystallised,
              drawdown_pot:       sippTax.drawdown,
              pcls_max:           sippTax.pcls_max,
              has_lta_protection: false,
            } : undefined}
          />
        );
      })()}
    </PageShell>
  );
}
