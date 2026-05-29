import { useState, useEffect, useRef } from "react";
import { X, PlusCircle, ArrowDownCircle, Layers, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn, fmt } from "../../lib/utils";
import { Button } from "../ui/button";
import { useAddBondTransaction } from "../../hooks/useWrapperTransactions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BondContext {
  total_premiums:       number;
  segments_remaining:   number;
  cost_per_segment:     number;
  value_per_segment:    number;
  cumulative_allowance: number;
  allowance_used:       number;
  annual_allowance:     number;
  years_held:           number;
  current_value:        number;
  running_cost_basis:   number;
}

interface AddTransactionDrawerProps {
  open:       boolean;
  onClose:    () => void;
  wrapperId:  string;
  bondCtx:    BondContext;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type TxTab = "PREMIUM" | "WITHDRAWAL" | "SEGMENT_ENCASHMENT";

const TABS: { key: TxTab; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { key: "PREMIUM",           label: "Premium",    icon: PlusCircle,      desc: "New money into the bond" },
  { key: "WITHDRAWAL",        label: "Withdrawal", icon: ArrowDownCircle, desc: "Cash out (5% rule applies)" },
  { key: "SEGMENT_ENCASHMENT",label: "Encashment", icon: Layers,          desc: "Surrender specific segments" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Field({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2.5",
        "placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002147] focus:border-[#002147]",
        props.className
      )}
    />
  );
}

// ── Impact boxes ──────────────────────────────────────────────────────────────

function ImpactRow({ label, before, after, highlight }: {
  label: string; before: string; after: string; highlight?: "warn" | "good" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#E2E8F0] last:border-0">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-2 text-right">
        {before && <span className="text-slate-400 line-through tabular-nums">{before}</span>}
        {before && <span className="text-slate-400">→</span>}
        <span className={cn(
          "font-semibold tabular-nums",
          highlight === "warn"    ? "text-amber-600" :
          highlight === "good"    ? "text-emerald-600" :
          "text-[#0F172A]"
        )}>{after}</span>
      </div>
    </div>
  );
}

// ── Premium form ──────────────────────────────────────────────────────────────

function PremiumForm({
  ctx, wrapperId, onDone,
}: { ctx: BondContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]     = useState(today());
  const [amount, setAmount] = useState("");
  const addTx               = useAddBondTransaction(wrapperId, ctx.years_held);

  const amt          = parseFloat(amount.replace(/,/g, "")) || 0;
  const origCostPerSeg = ctx.cost_per_segment;
  const newSegments  = Math.round(amt / origCostPerSeg);
  const newPremiums  = ctx.total_premiums + amt;
  const newAnnual    = newPremiums * 0.05;

  async function submit() {
    if (!amt || !date) return;
    await addTx.mutateAsync({ type: "PREMIUM", date, amount: amt });
    onDone();
  }

  return (
    <div className="space-y-5">
      <Field label="Date">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="Premium Amount (£)" sub="Additional money invested into the bond">
        <Input
          type="number" placeholder="0" min="0" step="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      {amt > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Impact</p>
          <ImpactRow label="Total premiums"     before={fmt(ctx.total_premiums)}   after={fmt(newPremiums)}  />
          <ImpactRow label="Segments"           before={String(ctx.segments_remaining)} after={String(ctx.segments_remaining + newSegments)} highlight="good" />
          <ImpactRow label="5% annual allowance" before={fmt(ctx.annual_allowance)} after={fmt(newAnnual)}   highlight="good" />
        </div>
      )}

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Adding premiums increases the 5% annual tax-deferred withdrawal allowance. New segments are allocated based on the original cost per segment (£{origCostPerSeg.toLocaleString()}).
        </p>
      </div>

      <Button
        className="w-full"
        onClick={submit}
        disabled={!amt || !date || addTx.isPending}
      >
        {addTx.isPending ? "Adding…" : `Add Premium — ${fmt(amt)}`}
      </Button>
    </div>
  );
}

// ── Withdrawal form ───────────────────────────────────────────────────────────

function WithdrawalForm({
  ctx, wrapperId, onDone,
}: { ctx: BondContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]     = useState(today());
  const [amount, setAmount] = useState("");
  const addTx               = useAddBondTransaction(wrapperId, ctx.years_held);

  const amt             = parseFloat(amount.replace(/,/g, "")) || 0;
  const cumulRemaining  = ctx.cumulative_allowance - ctx.allowance_used;
  const annualRemaining = ctx.annual_allowance - (ctx.allowance_used % ctx.annual_allowance);
  const isWithinAnnual  = amt > 0 && amt <= annualRemaining;
  const isWithinCumul   = amt > 0 && amt <= cumulRemaining;
  const excess          = Math.max(0, amt - cumulRemaining);

  const statusColor = !amt ? "neutral"
    : isWithinAnnual ? "green"
    : isWithinCumul  ? "amber"
    : "red";

  async function submit() {
    if (!amt || !date) return;
    await addTx.mutateAsync({
      type: "WITHDRAWAL", date, amount: amt,
      cumulative_allowance: ctx.cumulative_allowance,
      allowance_used: ctx.allowance_used,
    });
    onDone();
  }

  return (
    <div className="space-y-5">
      <Field label="Date">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="Withdrawal Amount (£)">
        <Input
          type="number" placeholder="0" min="0" step="250"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      {/* 5% Allowance tracker */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">5% Allowance Status</p>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Annual allowance (this year)</span>
            <span className="text-[#0F172A] tabular-nums">{fmt(ctx.annual_allowance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cumulative available (unused years)</span>
            <span className="text-[#0F172A] tabular-nums">{fmt(cumulRemaining)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                statusColor === "red" ? "bg-rose-500" :
                statusColor === "amber" ? "bg-amber-500" :
                "bg-emerald-500"
              )}
              style={{ width: `${Math.min(100, ((ctx.allowance_used + amt) / ctx.cumulative_allowance) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1 text-slate-400">
            <span>Used: {fmt(ctx.allowance_used + amt)}</span>
            <span>Limit: {fmt(ctx.cumulative_allowance)}</span>
          </div>
        </div>

        {/* Status indicator */}
        {amt > 0 && (
          <div className={cn(
            "flex items-start gap-2 rounded-lg p-3 border",
            statusColor === "green" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
            statusColor === "amber" ? "bg-amber-50  border-amber-200  text-amber-700"   :
            statusColor === "red"   ? "bg-rose-50   border-rose-200   text-rose-600"    :
            "border-[#E2E8F0] text-slate-500"
          )}>
            {statusColor === "green" && <CheckCircle2  className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            {statusColor === "amber" && <Info          className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            {statusColor === "red"   && <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            <p className="text-xs leading-relaxed">
              {statusColor === "green" &&
                `£${amt.toLocaleString()} is within this year's annual 5% allowance (£${annualRemaining.toLocaleString()} remaining). Fully tax-deferred — no immediate tax liability.`}
              {statusColor === "amber" &&
                `£${amt.toLocaleString()} exceeds this year's allowance (£${annualRemaining.toLocaleString()}) but is within the cumulative unused allowance (£${cumulRemaining.toLocaleString()}). Tax-deferred using prior-year unused allowances.`}
              {statusColor === "red" &&
                `£${excess.toLocaleString()} exceeds the total cumulative allowance — this amount will trigger a chargeable event gain and be assessed as income in the current tax year.`}
            </p>
          </div>
        )}
      </div>

      <Button
        className="w-full"
        onClick={submit}
        disabled={!amt || !date || addTx.isPending}
      >
        {addTx.isPending ? "Adding…" : `Record Withdrawal — ${fmt(amt)}`}
      </Button>
    </div>
  );
}

// ── Segment encashment form ───────────────────────────────────────────────────

function EncashmentForm({
  ctx, wrapperId, onDone,
}: { ctx: BondContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]     = useState(today());
  const [segs, setSegs]     = useState("");
  const addTx               = useAddBondTransaction(wrapperId, ctx.years_held);

  const n              = Math.min(parseInt(segs) || 0, ctx.segments_remaining);
  const costPerSeg     = ctx.segments_remaining > 0 ? ctx.running_cost_basis / ctx.segments_remaining : ctx.cost_per_segment;
  const valuePerSeg    = ctx.value_per_segment;
  const costOfSegs     = costPerSeg * n;
  const valueReceived  = valuePerSeg * n;
  const gain           = valueReceived - costOfSegs;
  const newCostBasis   = ctx.running_cost_basis - costOfSegs;
  const newAnnualAllow = newCostBasis * 0.05;
  const newSegments    = ctx.segments_remaining - n;
  const gainPct        = costOfSegs > 0 ? (gain / costOfSegs) * 100 : 0;

  async function submit() {
    if (!n || !date) return;
    await addTx.mutateAsync({
      type: "SEGMENT_ENCASHMENT", date, segments: n,
      current_cost_basis: ctx.running_cost_basis,
      current_segments: ctx.segments_remaining,
      current_value: ctx.current_value,
    });
    onDone();
  }

  return (
    <div className="space-y-5">
      <Field label="Date">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field
        label="Segments to Encash"
        sub={`${ctx.segments_remaining} segments remaining  ·  £${valuePerSeg.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} per segment`}
      >
        <div className="flex items-center gap-3">
          <Input
            type="number" placeholder="0" min="1"
            max={ctx.segments_remaining}
            value={segs}
            onChange={(e) => setSegs(e.target.value)}
            className="flex-1"
          />
          <span className="text-sm text-slate-500 whitespace-nowrap">of {ctx.segments_remaining}</span>
        </div>
        {/* Quick-select buttons */}
        <div className="flex gap-2 mt-2">
          {[5, 10, 20, 25].filter((v) => v <= ctx.segments_remaining).map((v) => (
            <button
              key={v}
              onClick={() => setSegs(String(v))}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs border transition-colors",
                parseInt(segs) === v
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "border-[#E2E8F0] text-slate-500 hover:text-[#0F172A] hover:border-slate-300"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </Field>

      {n > 0 && (
        <>
          {/* Chargeable gain callout */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Chargeable Event Gain</span>
              <span className="text-xl font-bold text-violet-700 tabular-nums">
                {fmt(gain)}
              </span>
            </div>
            <p className="text-xs text-violet-600">
              Assessed as income in the tax year of encashment · {gainPct.toFixed(1)}% gain on cost
            </p>
          </div>

          {/* Impact breakdown */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-0.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">After encashment</p>
            <ImpactRow label={`Cash received (${n} seg${n !== 1 ? "s" : ""})`} before="" after={fmt(valueReceived)} highlight="good" />
            <ImpactRow label="Chargeable gain"            before=""                           after={fmt(gain)}           highlight="warn" />
            <ImpactRow label="Segments remaining"         before={String(ctx.segments_remaining)} after={String(newSegments)}   />
            <ImpactRow label="Cost basis"                 before={fmt(ctx.running_cost_basis)} after={fmt(newCostBasis)}    highlight={newCostBasis < ctx.running_cost_basis ? "warn" : "neutral"} />
            <ImpactRow label="5% annual allowance"        before={fmt(ctx.annual_allowance)}   after={fmt(newAnnualAllow)} highlight={newAnnualAllow < ctx.annual_allowance ? "warn" : "neutral"} />
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              Encashing these {n} segments permanently reduces the cost basis by {fmt(costOfSegs)} and lowers the annual 5% allowance from {fmt(ctx.annual_allowance)} to {fmt(newAnnualAllow)} on the remaining {newSegments} segments.
              {n > 0 && ` Top-slicing may reduce the higher-rate liability on the £${gain.toLocaleString()} gain.`}
            </p>
          </div>
        </>
      )}

      <Button
        className="w-full"
        onClick={submit}
        disabled={!n || !date || addTx.isPending}
      >
        {addTx.isPending ? "Recording…" : n > 0
          ? `Encash ${n} Segment${n !== 1 ? "s" : ""} — ${fmt(valueReceived)}`
          : "Select Segments"}
      </Button>
    </div>
  );
}

// ── Drawer shell ─────────────────────────────────────────────────────────────

export function AddTransactionDrawer({ open, onClose, wrapperId, bondCtx }: AddTransactionDrawerProps) {
  const [tab, setTab] = useState<TxTab>("WITHDRAWAL");
  const prevOpen      = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) setTab("WITHDRAWAL");
    prevOpen.current = open;
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[480px] z-50",
          "bg-white border-l border-[#E2E8F0] shadow-2xl",
          "flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Add Transaction</h2>
            <p className="text-xs text-slate-500 mt-0.5">Offshore Bond · RL360</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="px-6 pt-5 pb-1 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {TABS.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl py-3.5 px-2 border text-center transition-all",
                  tab === key
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "border-[#E2E8F0] text-slate-500 hover:text-[#0F172A] hover:border-slate-300"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] opacity-70 leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "PREMIUM"            && <PremiumForm    ctx={bondCtx} wrapperId={wrapperId} onDone={onClose} />}
          {tab === "WITHDRAWAL"         && <WithdrawalForm ctx={bondCtx} wrapperId={wrapperId} onDone={onClose} />}
          {tab === "SEGMENT_ENCASHMENT" && <EncashmentForm ctx={bondCtx} wrapperId={wrapperId} onDone={onClose} />}
        </div>
      </div>
    </>
  );
}
