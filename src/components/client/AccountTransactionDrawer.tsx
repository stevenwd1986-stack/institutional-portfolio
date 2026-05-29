import { useState, useEffect, useRef } from "react";
import { X, PlusCircle, ArrowDownCircle, RefreshCw, TrendingDown, Users, Gift } from "lucide-react";
import { cn, fmt } from "../../lib/utils";
import { Button } from "../ui/button";
import { useAddAccountTransaction } from "../../hooks/useAccountTransactions";
import type { ISAContext, GIAContext, SIPPContext } from "../../hooks/useAccountTransactions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WrapperKind = "ISA" | "GIA" | "SIPP";

interface DrawerProps {
  open:        boolean;
  onClose:     () => void;
  wrapperId:   string;
  wrapperKind: WrapperKind;
  platform:    string;
  isaCtx?:     ISAContext;
  giaCtx?:     GIAContext;
  sippCtx?:    SIPPContext;
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

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

function ImpactRow({ label, value, highlight }: {
  label: string; value: string; highlight?: "warn" | "good" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#E2E8F0] last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={cn(
        "font-semibold tabular-nums",
        highlight === "warn" ? "text-amber-600" :
        highlight === "good" ? "text-emerald-600" : "text-[#0F172A]"
      )}>{value}</span>
    </div>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }

// ── ISA Forms ─────────────────────────────────────────────────────────────────

function ISAContributionForm({ ctx, wrapperId, onDone }: { ctx: ISAContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]     = useState(today());
  const [amount, setAmount] = useState("");
  const addTx               = useAddAccountTransaction(wrapperId, "ISA");

  const amt        = parseFloat(amount) || 0;
  const newUsed    = ctx.subscribed_this_year + amt;
  const newRemain  = Math.max(0, ctx.subscription_limit - newUsed);
  const exceedsLimit = amt > ctx.subscription_remaining;
  const pctUsed    = Math.min(100, (newUsed / ctx.subscription_limit) * 100);

  async function submit() {
    if (!amt || exceedsLimit) return;
    await addTx.mutateAsync({ type: "ISA_CONTRIBUTION", date, amount: amt, ctx });
    onDone();
  }

  return (
    <div className="space-y-5">
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>

      <Field label="Contribution Amount (£)" sub={`Annual limit: ${fmt(ctx.subscription_limit)} · Remaining: ${fmt(ctx.subscription_remaining)}`}>
        <Input type="number" placeholder="0" min="0" max={ctx.subscription_remaining} step="500"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>

      {amt > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">2024/25 Allowance</p>
          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", exceedsLimit ? "bg-rose-500" : "bg-emerald-500")}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Used: {fmt(newUsed)}</span>
            <span>Limit: {fmt(ctx.subscription_limit)}</span>
          </div>
          {exceedsLimit && (
            <p className="text-xs text-rose-500">
              Exceeds remaining allowance by {fmt(amt - ctx.subscription_remaining)}. ISA contributions cannot exceed the annual limit.
            </p>
          )}
          {!exceedsLimit && (
            <ImpactRow label="Remaining allowance after" value={fmt(newRemain)} highlight={newRemain > 0 ? "good" : "warn"} />
          )}
        </div>
      )}

      <Button className="w-full" onClick={submit}
        disabled={!amt || exceedsLimit || !date || addTx.isPending}>
        {addTx.isPending ? "Adding…" : `Subscribe ${fmt(amt)}`}
      </Button>
    </div>
  );
}

function ISAWithdrawalForm({ ctx, wrapperId, onDone }: { ctx: ISAContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]     = useState(today());
  const [amount, setAmount] = useState("");
  const addTx               = useAddAccountTransaction(wrapperId, "ISA");
  const amt = parseFloat(amount) || 0;

  async function submit() {
    if (!amt) return;
    await addTx.mutateAsync({ type: "ISA_WITHDRAWAL", date, amount: amt, ctx });
    onDone();
  }

  return (
    <div className="space-y-5">
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Withdrawal Amount (£)">
        <Input type="number" placeholder="0" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {ctx.is_flexible && amt > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700">
            Flexible ISA: {fmt(amt)} can be re-subscribed in the same tax year without consuming annual allowance.
          </p>
        </div>
      )}
      <Button className="w-full" onClick={submit} disabled={!amt || !date || addTx.isPending}>
        {addTx.isPending ? "Recording…" : `Record Withdrawal — ${fmt(amt)}`}
      </Button>
    </div>
  );
}

function ISAAPSForm({ ctx, wrapperId, onDone }: { ctx: ISAContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]       = useState(today());
  const [amount, setAmount]   = useState("");
  const [deceased, setDeceased] = useState("");
  const addTx                 = useAddAccountTransaction(wrapperId, "ISA");
  const amt   = parseFloat(amount) || 0;
  const apsAvail = ctx.aps_available ?? 0;
  const exceedsAPS = amt > apsAvail && apsAvail > 0;

  async function submit() {
    if (!amt || !deceased || exceedsAPS) return;
    await addTx.mutateAsync({ type: "ISA_APS_TRANSFER", date, amount: amt, from_deceased: deceased, ctx });
    onDone();
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700 font-semibold mb-1">Additional Permitted Subscription (APS)</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          The surviving spouse / civil partner can subscribe up to the value of the deceased's ISA without using their own annual allowance. The APS allowance equals the ISA value at death.
        </p>
      </div>
      <Field label="Date of Transfer"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Deceased's Name">
        <Input type="text" placeholder="e.g. Margaret Thornton"
          value={deceased} onChange={(e) => setDeceased(e.target.value)} />
      </Field>
      <Field label="APS Amount (£)" sub={apsAvail > 0 ? `APS allowance available: ${fmt(apsAvail)}` : "Enter the value of the deceased's ISA at date of death"}>
        <Input type="number" placeholder="0" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {exceedsAPS && <p className="text-xs text-rose-500">Amount exceeds APS allowance of {fmt(apsAvail)}.</p>}
      <Button className="w-full" onClick={submit} disabled={!amt || !deceased || exceedsAPS || !date || addTx.isPending}>
        {addTx.isPending ? "Recording…" : `Record APS Transfer — ${fmt(amt)}`}
      </Button>
    </div>
  );
}

// ── GIA Forms ─────────────────────────────────────────────────────────────────

function GIASellForm({ ctx, wrapperId, onDone }: { ctx: GIAContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]     = useState(today());
  const [asset, setAsset]   = useState("");
  const [qty, setQty]       = useState("");
  const [price, setPrice]   = useState("");
  const [costPu, setCostPu] = useState("");
  const addTx               = useAddAccountTransaction(wrapperId, "GIA");

  const q         = parseFloat(qty)    || 0;
  const p         = parseFloat(price)  || 0;
  const c         = parseFloat(costPu) || 0;
  const proceeds  = q * p;
  const costTotal = q * c;
  const gain      = proceeds - costTotal;
  const netGainYTD = ctx.net_gains_ytd + gain;
  const taxableGain = Math.max(0, netGainYTD - ctx.cgt_annual_exempt);
  const taxAt20   = taxableGain * 0.20;
  const taxAt24   = taxableGain * 0.24;

  async function submit() {
    if (!q || !p || !c || !asset || !date) return;
    await addTx.mutateAsync({ type: "GIA_SELL", date, asset_name: asset, quantity: q, price: p, cost_basis_unit: c });
    onDone();
  }

  return (
    <div className="space-y-4">
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Asset / Fund Name">
        <Input placeholder="e.g. Vanguard FTSE All-World ETF" value={asset} onChange={(e) => setAsset(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Quantity">
          <Input type="number" placeholder="0" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Sale Price £">
          <Input type="number" placeholder="0.00" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Cost/Unit £">
          <Input type="number" placeholder="0.00" step="0.01" value={costPu} onChange={(e) => setCostPu(e.target.value)} />
        </Field>
      </div>

      {q > 0 && p > 0 && c > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">CGT Position</p>
          <ImpactRow label="Proceeds"         value={fmt(proceeds)} highlight="good" />
          <ImpactRow label="Cost"             value={fmt(costTotal)} />
          <ImpactRow label={`Gain / (Loss)`}  value={(gain >= 0 ? "+" : "") + fmt(Math.abs(gain))} highlight={gain > 0 ? "warn" : "good"} />
          <ImpactRow label="Net gains YTD after" value={fmt(netGainYTD)} highlight={netGainYTD > ctx.cgt_annual_exempt ? "warn" : "neutral"} />
          {taxableGain > 0 && (
            <>
              <ImpactRow label={`CGT exempt (£${ctx.cgt_annual_exempt.toLocaleString()})`} value={`−${fmt(ctx.cgt_annual_exempt)}`} />
              <ImpactRow label="Taxable gain"    value={fmt(taxableGain)} highlight="warn" />
              <ImpactRow label="Tax @ 20% (basic)"  value={fmt(taxAt20)} />
              <ImpactRow label="Tax @ 24% (higher)" value={fmt(taxAt24)} highlight="warn" />
            </>
          )}
          {taxableGain <= 0 && netGainYTD <= ctx.cgt_annual_exempt && (
            <p className="text-xs text-emerald-600 mt-2">Within annual exempt amount — no CGT due on this disposal.</p>
          )}
        </div>
      )}

      <Button className="w-full" onClick={submit} disabled={!q || !p || !c || !asset || !date || addTx.isPending}>
        {addTx.isPending ? "Recording…" : proceeds > 0 ? `Record Sale — ${fmt(proceeds)}` : "Enter details above"}
      </Button>
    </div>
  );
}

function GIABuyForm({ wrapperId, onDone }: { wrapperId: string; onDone: () => void }) {
  const [date, setDate]   = useState(today());
  const [asset, setAsset] = useState("");
  const [qty, setQty]     = useState("");
  const [price, setPrice] = useState("");
  const addTx             = useAddAccountTransaction(wrapperId, "GIA");

  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  const total = q * p;

  async function submit() {
    if (!q || !p || !asset || !date) return;
    await addTx.mutateAsync({ type: "GIA_BUY", date, asset_name: asset, quantity: q, price: p });
    onDone();
  }

  return (
    <div className="space-y-4">
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Asset / Fund Name">
        <Input placeholder="e.g. iShares MSCI World ETF" value={asset} onChange={(e) => setAsset(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity"><Input type="number" placeholder="0" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Price £"><Input type="number" placeholder="0.00" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      </div>
      {total > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
          <ImpactRow label="Total consideration" value={fmt(total)} />
          <ImpactRow label="Cost basis / unit"    value={`£${p.toFixed(2)}`} />
        </div>
      )}
      <Button className="w-full" onClick={submit} disabled={!q || !p || !asset || !date || addTx.isPending}>
        {addTx.isPending ? "Recording…" : total > 0 ? `Record Purchase — ${fmt(total)}` : "Enter details above"}
      </Button>
    </div>
  );
}

// ── SIPP Forms ────────────────────────────────────────────────────────────────

function SIPPContribForm({ ctx, wrapperId, onDone }: { ctx: SIPPContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]      = useState(today());
  const [net, setNet]        = useState("");
  const [isEmp, setIsEmp]    = useState(false);
  const addTx                = useAddAccountTransaction(wrapperId, "SIPP");

  const netAmt   = parseFloat(net) || 0;
  const gross    = isEmp ? netAmt : netAmt * 1.25;
  const relief   = isEmp ? 0 : netAmt * 0.25;
  const aaUsed   = ctx.aa_used + gross;
  const aaOver   = aaUsed > ctx.annual_allowance;

  async function submit() {
    if (!netAmt || !date) return;
    if (isEmp) {
      await addTx.mutateAsync({ type: "SIPP_EMPLOYER_CONTRIBUTION", date, amount: netAmt, ctx });
    } else {
      await addTx.mutateAsync({ type: "SIPP_CONTRIBUTION", date, net_amount: netAmt, ctx });
    }
    onDone();
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[false, true].map((emp) => (
          <button key={String(emp)} onClick={() => setIsEmp(emp)}
            className={cn(
              "flex-1 py-2.5 rounded-lg border text-xs font-semibold transition-colors",
              isEmp === emp ? "bg-amber-50 border-amber-200 text-amber-700" : "border-[#E2E8F0] text-slate-500 hover:text-[#0F172A] hover:border-slate-300"
            )}>
            {emp ? "Employer Contribution" : "Personal Contribution"}
          </button>
        ))}
      </div>
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label={isEmp ? "Employer Amount (£)" : "Net Contribution (£)"}
        sub={isEmp ? "Employer contributions receive no personal tax relief" : "20% basic rate relief added automatically by HMRC (claim higher rate via self-assessment)"}>
        <Input type="number" placeholder="0" min="0" step="100" value={net} onChange={(e) => setNet(e.target.value)} />
      </Field>

      {netAmt > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Annual Allowance</p>
          {!isEmp && <ImpactRow label="Tax relief added"     value={fmt(relief)} highlight="good" />}
          <ImpactRow label="Gross contribution"   value={fmt(gross)} />
          <ImpactRow label="AA used after"         value={fmt(aaUsed)} highlight={aaOver ? "warn" : "neutral"} />
          <ImpactRow label="AA remaining after"    value={fmt(Math.max(0, ctx.annual_allowance - aaUsed))} highlight={aaOver ? "warn" : "good"} />
          <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", aaOver ? "bg-rose-500" : "bg-amber-500")}
              style={{ width: `${Math.min(100, (aaUsed / ctx.annual_allowance) * 100)}%` }} />
          </div>
          {aaOver && <p className="text-xs text-rose-500 mt-1">Exceeds annual allowance by {fmt(aaUsed - ctx.annual_allowance)}. Tax charge applies.</p>}
        </div>
      )}

      <Button className="w-full" onClick={submit} disabled={!netAmt || !date || addTx.isPending}>
        {addTx.isPending ? "Adding…" : `Record ${isEmp ? "Employer Contribution" : "Personal Contribution"} — ${fmt(isEmp ? netAmt : gross)}`}
      </Button>
    </div>
  );
}

function SIPPWithdrawalForm({ ctx, wrapperId, onDone }: { ctx: SIPPContext; wrapperId: string; onDone: () => void }) {
  const [date, setDate]         = useState(today());
  const [amount, setAmount]     = useState("");
  const [mode, setMode]         = useState<"UFPLS" | "DRAWDOWN">("UFPLS");
  const addTx                   = useAddAccountTransaction(wrapperId, "SIPP");

  const amt   = parseFloat(amount) || 0;
  const tfls  = mode === "UFPLS" ? amt * 0.25 : 0;
  const taxable = mode === "UFPLS" ? amt * 0.75 : amt;
  const maxUFPLS = ctx.uncrystallised;
  const maxDD    = ctx.drawdown_pot;
  const exceedsUFPLS = mode === "UFPLS" && amt > maxUFPLS;
  const exceedsDD    = mode === "DRAWDOWN" && amt > maxDD;

  async function submit() {
    if (!amt || !date) return;
    await addTx.mutateAsync({ type: "SIPP_UFPLS_WITHDRAWAL", date, amount: amt, ctx });
    onDone();
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["UFPLS", "DRAWDOWN"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-2.5 rounded-lg border text-xs font-semibold transition-colors",
              mode === m ? "bg-amber-50 border-amber-200 text-amber-700" : "border-[#E2E8F0] text-slate-500 hover:text-[#0F172A] hover:border-slate-300"
            )}>
            {m === "UFPLS" ? "UFPLS" : "Drawdown"}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {mode === "UFPLS"
          ? `UFPLS: each payment is 25% tax-free / 75% income tax. Available: ${fmt(maxUFPLS)} uncrystallised funds.`
          : `Drawdown: 100% taxable income from crystallised drawdown pot. Available: ${fmt(maxDD)}.`}
      </p>
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Withdrawal Amount (£)">
        <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {amt > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tax Split</p>
          {mode === "UFPLS" && <ImpactRow label="Tax-free (25%)" value={fmt(tfls)} highlight="good" />}
          <ImpactRow label="Taxable income" value={fmt(taxable)} highlight="warn" />
        </div>
      )}
      {exceedsUFPLS && <p className="text-xs text-rose-500">Exceeds available uncrystallised funds ({fmt(maxUFPLS)}).</p>}
      {exceedsDD    && <p className="text-xs text-rose-500">Exceeds drawdown pot ({fmt(maxDD)}).</p>}
      <Button className="w-full" onClick={submit} disabled={!amt || exceedsUFPLS || exceedsDD || !date || addTx.isPending}>
        {addTx.isPending ? "Recording…" : `Record ${mode} — ${fmt(amt)}`}
      </Button>
    </div>
  );
}

function GIASpousalForm({ wrapperId, onDone }: { wrapperId: string; onDone: () => void }) {
  const [date, setDate]         = useState(today());
  const [amount, setAmount]     = useState("");
  const [deceased, setDeceased] = useState("");
  const addTx                   = useAddAccountTransaction(wrapperId, "GIA");
  const amt = parseFloat(amount) || 0;

  async function submit() {
    if (!amt || !deceased || !date) return;
    await addTx.mutateAsync({ type: "GIA_SPOUSAL_TRANSFER", date, amount: amt, from_deceased: deceased });
    onDone();
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700 font-semibold mb-1">Spousal GIA Transfer (Inherited Assets)</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Assets inherited from a deceased spouse transfer at probate value, which becomes the new CGT cost basis for the inheriting spouse. No CGT is triggered on death — only on a future disposal.
        </p>
      </div>
      <Field label="Date of Transfer"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Deceased's Name">
        <Input placeholder="e.g. Margaret Thornton" value={deceased} onChange={(e) => setDeceased(e.target.value)} />
      </Field>
      <Field label="Transfer Value (£)" sub="Probate / market value at date of death — this becomes the new cost basis">
        <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {amt > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
          <ImpactRow label="New CGT cost basis" value={fmt(amt)} highlight="neutral" />
          <ImpactRow label="CGT on transfer" value="£0 — no disposal at death" highlight="good" />
        </div>
      )}
      <Button className="w-full" onClick={submit} disabled={!amt || !deceased || !date || addTx.isPending}>
        {addTx.isPending ? "Recording…" : `Record Inherited Transfer — ${fmt(amt)}`}
      </Button>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────

type TabKey = string;

interface TabConfig {
  key:   TabKey;
  label: string;
  icon:  React.ComponentType<{ className?: string }>;
  desc:  string;
}

const ISA_TABS: TabConfig[] = [
  { key: "contribution", label: "Subscribe",  icon: PlusCircle,    desc: "Add to ISA" },
  { key: "withdrawal",   label: "Withdrawal", icon: ArrowDownCircle, desc: "Take cash out" },
  { key: "aps",          label: "APS Transfer", icon: Users,        desc: "Spousal APS" },
];

const GIA_TABS: TabConfig[] = [
  { key: "buy",      label: "Buy",      icon: PlusCircle,     desc: "Purchase holding"    },
  { key: "sell",     label: "Sell",     icon: TrendingDown,   desc: "Disposal / CGT"      },
  { key: "dividend", label: "Income",   icon: Gift,           desc: "Dividend / interest" },
  { key: "spousal",  label: "Spousal",  icon: Users,          desc: "Inherited assets"    },
];

const SIPP_TABS: TabConfig[] = [
  { key: "contribution", label: "Contribution", icon: PlusCircle,     desc: "Personal / employer" },
  { key: "withdrawal",   label: "Withdrawal",   icon: ArrowDownCircle, desc: "UFPLS / drawdown"   },
];

const WRAPPER_TABS: Record<WrapperKind, TabConfig[]> = {
  ISA:  ISA_TABS,
  GIA:  GIA_TABS,
  SIPP: SIPP_TABS,
};

const WRAPPER_ACCENT: Record<WrapperKind, string> = {
  ISA:  "bg-emerald-50 border-emerald-200 text-emerald-700",
  GIA:  "bg-[#E8F0FE]  border-[#002147]/20 text-[#002147]",
  SIPP: "bg-amber-50   border-amber-200   text-amber-700",
};

// ── Drawer shell ──────────────────────────────────────────────────────────────

export function AccountTransactionDrawer({
  open, onClose, wrapperId, wrapperKind, platform, isaCtx, giaCtx, sippCtx,
}: DrawerProps) {
  const tabs          = WRAPPER_TABS[wrapperKind];
  const [tab, setTab] = useState(tabs[0].key);
  const prevOpen      = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) setTab(WRAPPER_TABS[wrapperKind][0].key);
    prevOpen.current = open;
  }, [open, wrapperKind]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div className={cn(
        "fixed top-0 right-0 h-full w-[500px] z-50",
        "bg-white border-l border-[#E2E8F0] shadow-2xl",
        "flex flex-col transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Add Transaction</h2>
            <p className="text-xs text-slate-500 mt-0.5">{wrapperKind} · {platform}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="px-6 pt-5 pb-1 shrink-0">
          <div className={cn("grid gap-2", `grid-cols-${tabs.length}`)}>
            {tabs.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl py-3.5 px-2 border text-center transition-all",
                  tab === key ? WRAPPER_ACCENT[wrapperKind] : "border-[#E2E8F0] text-slate-500 hover:text-[#0F172A] hover:border-slate-300"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] opacity-70 leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── ISA ── */}
          {wrapperKind === "ISA" && isaCtx && (
            <>
              {tab === "contribution" && <ISAContributionForm ctx={isaCtx} wrapperId={wrapperId} onDone={onClose} />}
              {tab === "withdrawal"   && <ISAWithdrawalForm   ctx={isaCtx} wrapperId={wrapperId} onDone={onClose} />}
              {tab === "aps"          && <ISAAPSForm          ctx={isaCtx} wrapperId={wrapperId} onDone={onClose} />}
            </>
          )}
          {/* ── GIA ── */}
          {wrapperKind === "GIA" && giaCtx && (
            <>
              {tab === "buy"      && <GIABuyForm  wrapperId={wrapperId} onDone={onClose} />}
              {tab === "sell"     && <GIASellForm  ctx={giaCtx} wrapperId={wrapperId} onDone={onClose} />}
              {tab === "dividend" && (
                <div className="space-y-5">
                  <Field label="Date"><Input type="date" defaultValue={today()} /></Field>
                  <Field label="Asset"><Input placeholder="e.g. iShares MSCI World" /></Field>
                  <Field label="Dividend Amount (£)"><Input type="number" placeholder="0" /></Field>
                  <Button className="w-full" disabled>Record Income (coming soon)</Button>
                </div>
              )}
              {tab === "spousal" && <GIASpousalForm wrapperId={wrapperId} onDone={onClose} />}
            </>
          )}
          {/* ── SIPP ── */}
          {wrapperKind === "SIPP" && sippCtx && (
            <>
              {tab === "contribution" && <SIPPContribForm    ctx={sippCtx} wrapperId={wrapperId} onDone={onClose} />}
              {tab === "withdrawal"   && <SIPPWithdrawalForm  ctx={sippCtx} wrapperId={wrapperId} onDone={onClose} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
