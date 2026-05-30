import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { calculateTWR }  from "../performance/twr";
import { calculateXIRR } from "../performance/xirr";
import { calculateCAGR } from "../performance/cagr";

export interface HoldingDetail {
  id:              string;
  asset_name:      string;
  isin:            string | null;
  asset_class:     string;
  units:           number;
  price:           number;
  market_value:    number;
  cost_basis:      number;
  unrealised_gain: number;
  realised_gain:   number;
  pct_gain:        number;
}

export interface GIATaxDetails {
  type:              "GIA";
  unrealised_gains:  number;
  cgt_annual_exempt: number;
  taxable_gains:     number;
  tax_basic:         number;
  tax_higher:        number;
  position_gains:    { name: string; gain: number; cost: number }[];
}

export interface OffshoresBondTaxDetails {
  type:                  "OFFSHORE_BOND";
  total_premiums:        number;
  chargeable_event_gain: number;
  annual_allowance_5pct: number;
  years_held:            number;
  cumulative_allowance:  number;
  allowance_used:        number;
  allowance_remaining:   number;
  top_sliced_gain:       number;
}

export interface SIPPTaxDetails {
  type:                "SIPP";
  uncrystallised:      number;
  drawdown:            number;
  annual_allowance:    number;
  allowance_used:      number;
  allowance_remaining: number;
  pcls_available:      number;
  pcls_max:            number;
}

export interface ISATaxDetails {
  type:                      "ISA";
  total_subscribed:          number;
  tax_free_growth:           number;
  current_year_subscription: number;
  subscription_limit:        number;
  subscription_remaining:    number;
}

export type TaxDetails =
  | GIATaxDetails
  | OffshoresBondTaxDetails
  | SIPPTaxDetails
  | ISATaxDetails;

export interface WrapperDetail {
  id:             string;
  client_id:      string;
  wrapper_type:   "SIPP" | "ISA" | "GIA" | "OFFSHORE_BOND";
  platform:       string;
  value:          number;
  cost_basis:     number;
  performance_1y: number;
  twr:            number;
  xirr:           number;
  cagr:           number;
  holdings:       HoldingDetail[];
  tax:            TaxDetails;
}

const WRAPPER_TYPE_MAP: Record<string, WrapperDetail["wrapper_type"]> = {
  isa_ss: "ISA", isa_cash: "ISA",
  sipp: "SIPP", sipp_drawdown: "SIPP", dc_workplace: "SIPP", db_workplace: "SIPP",
  gia: "GIA",
  investment_bond: "OFFSHORE_BOND",
};

const PCLS_MAX = 268_275;
const CGT_EXEMPT = 3_000;

async function buildTax(
  wrapperType: WrapperDetail["wrapper_type"],
  clientId:    string,
  accountId:   string,
  value:       number,
  costBasis:   number,
  holdings:    HoldingDetail[],
): Promise<TaxDetails> {
  if (wrapperType === "GIA") {
    const unrealised = holdings.reduce((s, h) => s + Math.max(0, h.unrealised_gain), 0);
    const taxable    = Math.max(0, unrealised - CGT_EXEMPT);
    return {
      type:              "GIA",
      unrealised_gains:  unrealised,
      cgt_annual_exempt: CGT_EXEMPT,
      taxable_gains:     taxable,
      tax_basic:         taxable * 0.20,
      tax_higher:        taxable * 0.24,
      position_gains:    holdings
        .filter((h) => h.unrealised_gain > 0)
        .map((h) => ({ name: h.asset_name, gain: h.unrealised_gain, cost: h.cost_basis })),
    };
  }

  if (wrapperType === "ISA") {
    const currentTaxYear = (() => {
      const now = new Date();
      const y   = now.getFullYear();
      return now.getMonth() < 3 ? `${y - 1}/${y}` : `${y}/${y + 1}`;
    })();

    const { data: sub } = await supabase
      .from("isa_subscriptions")
      .select("amount_subscribed, annual_allowance")
      .eq("account_id", accountId)
      .eq("tax_year", currentTaxYear)
      .maybeSingle();

    const subscribed  = sub?.amount_subscribed ?? 0;
    const limit       = sub?.annual_allowance  ?? 20_000;
    return {
      type:                      "ISA",
      total_subscribed:          costBasis,
      tax_free_growth:           value - costBasis,
      current_year_subscription: subscribed,
      subscription_limit:        limit,
      subscription_remaining:    Math.max(0, limit - subscribed),
    };
  }

  if (wrapperType === "SIPP") {
    const currentTaxYear = (() => {
      const now = new Date();
      const y   = now.getFullYear();
      return now.getMonth() < 3 ? `${y - 1}/${y}` : `${y}/${y + 1}`;
    })();

    const { data: pens } = await supabase
      .from("pension_allowance_usage")
      .select("annual_allowance, amount_used")
      .eq("client_id", clientId)
      .eq("tax_year", currentTaxYear)
      .maybeSingle();

    const allowance = pens?.annual_allowance ?? 60_000;
    const used      = pens?.amount_used      ?? 0;
    return {
      type:                "SIPP",
      uncrystallised:      value,
      drawdown:            0,
      annual_allowance:    allowance,
      allowance_used:      used,
      allowance_remaining: Math.max(0, allowance - used),
      pcls_available:      Math.min(value * 0.25, PCLS_MAX),
      pcls_max:            PCLS_MAX,
    };
  }

  // OFFSHORE_BOND
  return {
    type:                  "OFFSHORE_BOND",
    total_premiums:        costBasis,
    chargeable_event_gain: Math.max(0, value - costBasis),
    annual_allowance_5pct: costBasis * 0.05,
    years_held:            0,
    cumulative_allowance:  0,
    allowance_used:        0,
    allowance_remaining:   0,
    top_sliced_gain:       0,
  };
}

export function useWrapper(clientId: string, wrapperId: string) {
  return useQuery<WrapperDetail>({
    queryKey: ["wrapper", clientId, wrapperId],
    queryFn: async () => {
      if (!isSupabaseConfigured) throw new Error("Supabase not configured");

      const { data, error } = await supabase
        .from("accounts")
        .select(`
          id, account_type, provider, current_value, is_active, client_id,
          holdings(
            id, units, cost_basis, current_price, current_value,
            instruments(isin, name, asset_class)
          )
        `)
        .eq("id", wrapperId)
        .single();

      if (error) throw error;

      const wrapperType = WRAPPER_TYPE_MAP[data.account_type] ?? "GIA";

      const holdings: HoldingDetail[] = (data.holdings as any[]).map((h) => {
        const gain = (h.current_value ?? 0) - (h.cost_basis ?? 0);
        return {
          id:              h.id,
          asset_name:      h.instruments?.name ?? "Unknown",
          isin:            h.instruments?.isin ?? null,
          asset_class:     h.instruments?.asset_class ?? "EQUITY",
          units:           h.units ?? 0,
          price:           h.current_price > 0 ? h.current_price : ((h.units ?? 0) > 0 ? (h.current_value ?? 0) / h.units : 0),
          market_value:    h.current_value ?? 0,
          cost_basis:      h.cost_basis ?? 0,
          unrealised_gain: gain,
          realised_gain:   0,
          pct_gain:        (h.cost_basis ?? 0) > 0 ? gain / h.cost_basis : 0,
        };
      });

      const value     = data.current_value ?? 0;
      const costBasis = holdings.reduce((s, h) => s + h.cost_basis, 0);

      const today       = new Date();
      const oneYearAgo  = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().slice(0, 10);

      const [{ data: allVals }, { data: yearVals }, { data: txns }, tax] = await Promise.all([
        supabase
          .from("valuations")
          .select("valuation_date, market_value")
          .eq("tax_wrapper_id", wrapperId)
          .order("valuation_date"),
        supabase
          .from("valuations")
          .select("valuation_date, market_value")
          .eq("tax_wrapper_id", wrapperId)
          .gte("valuation_date", oneYearAgoStr)
          .order("valuation_date"),
        supabase
          .from("transactions")
          .select("trade_date, net_amount, is_book_over, transaction_type, sub_accounts!inner(tax_wrapper_id)")
          .eq("sub_accounts.tax_wrapper_id", wrapperId)
          .order("trade_date"),
        buildTax(wrapperType, clientId, wrapperId, value, costBasis, holdings),
      ]);

      const INFLOW_TYPES = ["CONTRIBUTION", "TRANSFER_IN_CASH", "BUY"];

      const allValPoints = (allVals ?? []).map((v) => ({
        date:  new Date(v.valuation_date),
        value: Number(v.market_value),
      }));

      const yearValPoints = (yearVals ?? []).map((v) => ({
        date:  new Date(v.valuation_date),
        value: Number(v.market_value),
      }));

      const cfEvents = (txns ?? []).map((t: any) => ({
        date:         new Date(t.trade_date),
        amount:       INFLOW_TYPES.includes(t.transaction_type)
                        ? -Number(t.net_amount)
                        : Number(t.net_amount),
        is_book_over: Boolean(t.is_book_over),
      }));

      let twr            = 0;
      let performance_1y = 0;
      let xirr           = 0;
      let cagr           = 0;

      // TWR — all-time
      if (allValPoints.length >= 2) {
        const result = calculateTWR(allValPoints, cfEvents, allValPoints[0].date, today);
        if (result !== null) twr = result;
      }

      // 1Y Return — TWR over last 12 months
      if (yearValPoints.length >= 2) {
        const yearCFs = cfEvents.filter((cf) => cf.date >= oneYearAgo);
        const result  = calculateTWR(yearValPoints, yearCFs, oneYearAgo, today);
        if (result !== null) performance_1y = result;
      }

      // XIRR — aggregate cash flows + terminal value
      const xirrCFs: { date: Date; amount: number }[] = (txns ?? [])
        .filter((t: any) => !t.is_book_over)
        .map((t: any) => ({
          date:   new Date(t.trade_date),
          amount: INFLOW_TYPES.includes(t.transaction_type)
                    ? -Number(t.net_amount)
                    : Number(t.net_amount),
        }));
      if (allValPoints.length > 0) {
        xirrCFs.push({ date: today, amount: allValPoints.at(-1)!.value });
      }
      if (xirrCFs.length >= 2) {
        const result = calculateXIRR(xirrCFs);
        if (result !== null) xirr = result;
      }

      // CAGR — from first valuation to today
      if (allValPoints.length >= 2) {
        const result = calculateCAGR({
          initialValue: allValPoints[0].value,
          finalValue:   allValPoints.at(-1)!.value,
          startDate:    allValPoints[0].date,
          endDate:      today,
        });
        if (result !== null) cagr = result;
      }

      return {
        id:             data.id,
        client_id:      clientId,
        wrapper_type:   wrapperType,
        platform:       data.provider ?? "Unknown",
        value,
        cost_basis:     costBasis,
        performance_1y,
        twr,
        xirr,
        cagr,
        holdings,
        tax,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
