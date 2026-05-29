import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Shared ────────────────────────────────────────────────────────────────────

export type AccountTxType =
  // ISA
  | "ISA_CONTRIBUTION" | "ISA_WITHDRAWAL" | "ISA_TRANSFER_IN" | "ISA_APS_TRANSFER"
  // GIA
  | "GIA_BUY" | "GIA_SELL" | "GIA_DIVIDEND" | "GIA_SPOUSAL_TRANSFER"
  // SIPP
  | "SIPP_CONTRIBUTION" | "SIPP_EMPLOYER_CONTRIBUTION"
  | "SIPP_UFPLS_WITHDRAWAL"    // Uncrystallised Fund Pension Lump Sum (25% TFLS / 75% income)
  | "SIPP_CRYSTALLISATION"     // BCE — designates funds to drawdown / annuity
  | "SIPP_SPOUSAL_TRANSFER"    // Receive death-benefit pension from deceased spouse
  | "SIPP_DRAWDOWN_WITHDRAWAL" // Withdrawal from crystallised drawdown pot
  // Platform transfer
  | "TRANSFER_IN_SPECIE" | "TRANSFER_IN_CASH" | "TRANSFER_OUT_SPECIE" | "TRANSFER_OUT_CASH";

export interface AccountTransaction {
  id:          string;
  date:        string;
  type:        AccountTxType;
  description: string;
  amount:      number;   // cash equivalent (+ve = in, -ve = out)

  // ISA
  allowance_used_after?: number;
  allowance_remaining_after?: number;

  // GIA sell / buy
  asset_name?:      string;
  quantity?:        number;
  price_per_unit?:  number;
  cost_basis_unit?: number;   // for sell: original cost per unit
  cgt_gain?:        number;   // gain on sell (may be negative)

  // SIPP
  tax_relief_added?: number;       // 20% basic rate relief on personal contribution
  aa_used_after?:    number;       // running AA used
  aa_remaining_after?: number;
  tax_free_amount?:    number;     // UFPLS / PCLS tax-free portion
  taxable_amount?:     number;     // UFPLS / PCLS taxable portion

  // Spousal transfer
  from_deceased?: string;          // name of deceased spouse/member
  aps_used?:      number;          // APS allowance consumed
}

// ── ISA context ───────────────────────────────────────────────────────────────

export interface ISAContext {
  subscription_limit:          number;  // £20,000
  subscribed_this_year:        number;
  subscription_remaining:      number;
  is_flexible:                 boolean; // flexible ISA allows re-subscription after withdrawal
  aps_available?:              number;  // APS allowance if spousal transfer scenario
}

// ── GIA context ───────────────────────────────────────────────────────────────

export interface GIAContext {
  cgt_annual_exempt:   number;  // £3,000 (2024/25)
  gains_realised_ytd:  number;  // gains realised so far this tax year
  losses_realised_ytd: number;
  net_gains_ytd:       number;
}

// ── SIPP context ──────────────────────────────────────────────────────────────

export interface SIPPContext {
  annual_allowance:      number;  // £60,000
  aa_used:               number;
  aa_remaining:          number;
  uncrystallised:        number;
  drawdown_pot:          number;
  pcls_max:              number;   // £268,275 LTA cap
  has_lta_protection:    boolean;
}

// ── Demo state ────────────────────────────────────────────────────────────────

const SEED: Record<string, AccountTransaction[]> = {};

function makeSeed(wrapperId: string, type: string): AccountTransaction[] {
  if (SEED[wrapperId]) return SEED[wrapperId];

  if (type === "ISA") {
    return [{
      id: `isa-0-${wrapperId}`, date: "2024-04-06",
      type: "ISA_CONTRIBUTION", description: "Annual ISA subscription — 2024/25",
      amount: 14_500, allowance_used_after: 14_500, allowance_remaining_after: 5_500,
    }];
  }
  if (type === "GIA") {
    return [
      {
        id: `gia-0-${wrapperId}`, date: "2024-02-01",
        type: "GIA_BUY", description: "Buy: Vanguard FTSE All-World ETF",
        amount: -45_000, asset_name: "Vanguard FTSE All-World ETF", quantity: 400, price_per_unit: 112.5,
      },
      {
        id: `gia-1-${wrapperId}`, date: "2024-10-15",
        type: "GIA_SELL", description: "Sell: Vanguard FTSE All-World ETF — CGT event",
        amount: 25_200, asset_name: "Vanguard FTSE All-World ETF",
        quantity: 200, price_per_unit: 126, cost_basis_unit: 112.5, cgt_gain: 2_700,
      },
    ];
  }
  if (type === "SIPP") {
    return [
      {
        id: `sipp-0-${wrapperId}`, date: "2024-04-15",
        type: "SIPP_CONTRIBUTION", description: "Personal contribution (net) + 20% relief",
        amount: 40_000, tax_relief_added: 10_000, aa_used_after: 50_000, aa_remaining_after: 10_000,
      },
      {
        id: `sipp-1-${wrapperId}`, date: "2024-05-01",
        type: "SIPP_EMPLOYER_CONTRIBUTION", description: "Employer contribution",
        amount: 10_000, tax_relief_added: 0, aa_used_after: 60_000, aa_remaining_after: 0,
      },
    ];
  }
  return [];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAccountTransactions(wrapperId: string, wrapperType: string) {
  return useQuery<AccountTransaction[]>({
    queryKey:  ["account-txns", wrapperId],
    queryFn:   async () => {
      if (!SEED[wrapperId]) {
        SEED[wrapperId] = makeSeed(wrapperId, wrapperType);
      }
      return SEED[wrapperId];
    },
    staleTime: Infinity,
  });
}

// ── Mutation inputs ───────────────────────────────────────────────────────────

export interface ISAContributionInput  { type: "ISA_CONTRIBUTION";    date: string; amount: number; ctx: ISAContext }
export interface ISAWithdrawalInput    { type: "ISA_WITHDRAWAL";      date: string; amount: number; ctx: ISAContext }
export interface ISAAPSTransferInput   { type: "ISA_APS_TRANSFER";    date: string; amount: number; from_deceased: string; ctx: ISAContext }

export interface GIABuyInput           { type: "GIA_BUY";             date: string; asset_name: string; quantity: number; price: number }
export interface GIASellInput          { type: "GIA_SELL";            date: string; asset_name: string; quantity: number; price: number; cost_basis_unit: number }
export interface GIADividendInput      { type: "GIA_DIVIDEND";        date: string; asset_name: string; amount: number }
export interface GIASpousalInput       { type: "GIA_SPOUSAL_TRANSFER"; date: string; amount: number; from_deceased: string }

export interface SIPPContribInput      { type: "SIPP_CONTRIBUTION";   date: string; net_amount: number; ctx: SIPPContext }
export interface SIPPEmployerInput     { type: "SIPP_EMPLOYER_CONTRIBUTION"; date: string; amount: number; ctx: SIPPContext }
export interface SIPPUFPLSInput        { type: "SIPP_UFPLS_WITHDRAWAL"; date: string; amount: number; ctx: SIPPContext }
export interface SIPPCrystallisationInput { type: "SIPP_CRYSTALLISATION"; date: string; amount: number; ctx: SIPPContext }
export interface SIPPSpousalInput      { type: "SIPP_SPOUSAL_TRANSFER"; date: string; amount: number; from_deceased: string; ctx: SIPPContext }

export type AccountTxInput =
  | ISAContributionInput | ISAWithdrawalInput | ISAAPSTransferInput
  | GIABuyInput | GIASellInput | GIADividendInput | GIASpousalInput
  | SIPPContribInput | SIPPEmployerInput | SIPPUFPLSInput | SIPPCrystallisationInput | SIPPSpousalInput;

// ── Add-transaction mutation ──────────────────────────────────────────────────

export function useAddAccountTransaction(wrapperId: string, wrapperType: string) {
  const qc = useQueryClient();

  return useMutation<AccountTransaction[], Error, AccountTxInput>({
    mutationFn: async (input) => {
      const existing: AccountTransaction[] = qc.getQueryData(["account-txns", wrapperId]) ?? makeSeed(wrapperId, wrapperType);
      const id = `tx-${Date.now()}`;
      let tx: AccountTransaction;

      if (input.type === "ISA_CONTRIBUTION") {
        const gross = input.amount;
        const used  = input.ctx.subscribed_this_year + gross;
        tx = {
          id, date: input.date, type: "ISA_CONTRIBUTION",
          description: `ISA subscription — ${gross >= input.ctx.subscription_remaining ? "used remaining allowance" : "partial contribution"}`,
          amount: gross,
          allowance_used_after: used,
          allowance_remaining_after: Math.max(0, input.ctx.subscription_limit - used),
        };
      } else if (input.type === "ISA_WITHDRAWAL") {
        tx = {
          id, date: input.date, type: "ISA_WITHDRAWAL",
          description: input.ctx.is_flexible ? "Withdrawal (flexible ISA — allowance recoverable)" : "ISA withdrawal",
          amount: -input.amount,
        };
      } else if (input.type === "ISA_APS_TRANSFER") {
        tx = {
          id, date: input.date, type: "ISA_APS_TRANSFER",
          description: `APS spousal transfer — estate of ${input.from_deceased}`,
          amount: input.amount, from_deceased: input.from_deceased,
          aps_used: input.amount,
        };
      } else if (input.type === "GIA_BUY") {
        tx = {
          id, date: input.date, type: "GIA_BUY",
          description: `Buy: ${input.asset_name} × ${input.quantity} @ £${input.price.toFixed(2)}`,
          amount: -(input.quantity * input.price),
          asset_name: input.asset_name, quantity: input.quantity,
          price_per_unit: input.price, cost_basis_unit: input.price,
        };
      } else if (input.type === "GIA_SELL") {
        const proceeds = input.quantity * input.price;
        const cost     = input.quantity * input.cost_basis_unit;
        const gain     = proceeds - cost;
        tx = {
          id, date: input.date, type: "GIA_SELL",
          description: `Sell: ${input.asset_name} × ${input.quantity} @ £${input.price.toFixed(2)}${gain > 0 ? ` — gain £${gain.toLocaleString()}` : ` — loss £${Math.abs(gain).toLocaleString()}`}`,
          amount: proceeds,
          asset_name: input.asset_name, quantity: input.quantity,
          price_per_unit: input.price, cost_basis_unit: input.cost_basis_unit,
          cgt_gain: gain,
        };
      } else if (input.type === "GIA_DIVIDEND") {
        tx = {
          id, date: input.date, type: "GIA_DIVIDEND",
          description: `Dividend income: ${input.asset_name}`,
          amount: input.amount, asset_name: input.asset_name,
        };
      } else if (input.type === "GIA_SPOUSAL_TRANSFER") {
        tx = {
          id, date: input.date, type: "GIA_SPOUSAL_TRANSFER",
          description: `Inherited assets — estate of ${input.from_deceased} (probate value = new cost basis)`,
          amount: input.amount, from_deceased: input.from_deceased,
        };
      } else if (input.type === "SIPP_CONTRIBUTION") {
        const gross     = input.net_amount * 1.25;  // top up 20% basic rate relief
        const relief    = gross - input.net_amount;
        const aaUsed    = input.ctx.aa_used + gross;
        tx = {
          id, date: input.date, type: "SIPP_CONTRIBUTION",
          description: `Personal contribution — £${input.net_amount.toLocaleString()} net + £${relief.toLocaleString()} basic rate relief`,
          amount: gross, tax_relief_added: relief,
          aa_used_after: aaUsed,
          aa_remaining_after: Math.max(0, input.ctx.annual_allowance - aaUsed),
        };
      } else if (input.type === "SIPP_EMPLOYER_CONTRIBUTION") {
        const aaUsed = input.ctx.aa_used + input.amount;
        tx = {
          id, date: input.date, type: "SIPP_EMPLOYER_CONTRIBUTION",
          description: `Employer contribution`,
          amount: input.amount,
          aa_used_after: aaUsed,
          aa_remaining_after: Math.max(0, input.ctx.annual_allowance - aaUsed),
        };
      } else if (input.type === "SIPP_UFPLS_WITHDRAWAL") {
        const tfls     = input.amount * 0.25;
        const taxable  = input.amount * 0.75;
        tx = {
          id, date: input.date, type: "SIPP_UFPLS_WITHDRAWAL",
          description: `UFPLS withdrawal — £${tfls.toLocaleString()} tax-free / £${taxable.toLocaleString()} income`,
          amount: -input.amount, tax_free_amount: tfls, taxable_amount: taxable,
        };
      } else if (input.type === "SIPP_CRYSTALLISATION") {
        const pcls     = Math.min(input.amount * 0.25, input.ctx.pcls_max);
        const taxable  = input.amount - pcls;
        tx = {
          id, date: input.date, type: "SIPP_CRYSTALLISATION",
          description: `BCE — £${pcls.toLocaleString()} PCLS (tax-free) + £${taxable.toLocaleString()} to drawdown`,
          amount: -input.amount, tax_free_amount: pcls, taxable_amount: taxable,
        };
      } else {
        // SIPP_SPOUSAL_TRANSFER
        const inp = input as SIPPSpousalInput;
        tx = {
          id, date: inp.date, type: "SIPP_SPOUSAL_TRANSFER",
          description: `Death benefit / spousal pension transfer — ${inp.from_deceased}`,
          amount: inp.amount, from_deceased: inp.from_deceased,
        };
      }

      const raw = [...existing, tx];
      SEED[wrapperId] = raw;
      return raw;
    },
    onSuccess: (updated) => {
      qc.setQueryData(["account-txns", wrapperId], updated);
    },
  });
}
