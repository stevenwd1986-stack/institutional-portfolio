import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { calculateTWR } from "../performance/twr";
import { calculateXIRR } from "../performance/xirr";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReturnPeriod = "1M" | "6M" | "1Y" | "3Y" | "5Y";

export interface PeriodMetrics {
  twr:       number;
  twr_ann:   number;
  xirr:      number | null;
  available: boolean;
}

export interface WrapperPeriodPerformance {
  wrapper_id:      string;
  wrapper_type:    string;
  platform:        string;
  label:           string;
  aum:             number;
  is_closed:       boolean;
  closed_date?:    string;
  transferred_to?: string;
  periods:         Record<ReturnPeriod, PeriodMetrics>;
}

export interface ConsolidatedPerformance {
  wrappers:  WrapperPeriodPerformance[];
  portfolio: Record<ReturnPeriod, PeriodMetrics>;
  total_aum: number;
  note:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ann(totalReturn: number, years: number): number {
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

const PERIOD_YEARS: Record<ReturnPeriod, number> = {
  "1M": 1 / 12,
  "6M": 0.5,
  "1Y": 1,
  "3Y": 3,
  "5Y": 5,
};

const PERIODS = ["1M", "6M", "1Y", "3Y", "5Y"] as ReturnPeriod[];

function unavailable(): PeriodMetrics {
  return { twr: 0, twr_ann: 0, xirr: null, available: false };
}

function emptyPeriods(): Record<ReturnPeriod, PeriodMetrics> {
  return Object.fromEntries(PERIODS.map((p) => [p, unavailable()])) as Record<ReturnPeriod, PeriodMetrics>;
}

function periodStartDate(years: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.round(years * 365.25));
  return d;
}

function computeMetrics(
  allVals:   { date: Date; value: number }[],
  allCFs:    { date: Date; amount: number; is_book_over: boolean }[],
  years:     number,
  _periodKey: ReturnPeriod,
): PeriodMetrics {
  const pStart = periodStartDate(years);
  const pEnd   = new Date();

  // Need at least one valuation before or at period start and one at/after end
  const beforeStart = allVals.filter((v) => v.date <= pStart);
  const afterStart  = allVals.filter((v) => v.date >= pStart);

  if (afterStart.length < 2 && !(beforeStart.length > 0 && afterStart.length >= 1)) {
    return unavailable();
  }

  const twr = calculateTWR(allVals, allCFs, pStart, pEnd);
  if (twr === null) return unavailable();

  const twr_ann = years <= 1 ? twr : ann(twr, years);

  let xirr: number | null = null;
  if (years >= 1) {
    const xirrCFs = allCFs
      .filter((cf) => !cf.is_book_over && cf.date >= pStart)
      .map((cf) => ({ date: cf.date, amount: cf.amount }));

    const latest = allVals.at(-1);
    if (latest) xirrCFs.push({ date: pEnd, amount: latest.value });

    xirr = calculateXIRR(xirrCFs);
  }

  return { twr, twr_ann, xirr, available: true };
}

// ── AUM-weighted portfolio aggregate ─────────────────────────────────────────

function weightedPortfolio(
  wrappers: WrapperPeriodPerformance[],
): Record<ReturnPeriod, PeriodMetrics> {
  const result = {} as Record<ReturnPeriod, PeriodMetrics>;

  for (const p of PERIODS) {
    const active = wrappers.filter((w) => !w.is_closed && w.periods[p].available);
    const closed = wrappers.filter((w) => w.is_closed  && w.periods[p].available);
    const totalAUM = active.reduce((s, w) => s + w.aum, 0);

    if (totalAUM === 0) {
      result[p] = unavailable();
      continue;
    }

    let weightedTWR = active.reduce(
      (s, w) => s + (w.aum / totalAUM) * w.periods[p].twr,
      0,
    );

    if (closed.length > 0 && (p === "3Y" || p === "5Y")) {
      const closedWeight = 0.08;
      weightedTWR =
        weightedTWR * (1 - closedWeight) +
        (closed.reduce((s, w) => s + w.periods[p].twr, 0) / closed.length) * closedWeight;
    }

    const years    = PERIOD_YEARS[p];
    const twr_ann  = p === "1M" || p === "6M" ? weightedTWR : ann(weightedTWR, years);
    const xirr =
      p === "1Y" || p === "3Y" || p === "5Y"
        ? active.reduce((s, w) => s + (w.aum / totalAUM) * (w.periods[p].xirr ?? 0), 0)
        : null;

    result[p] = { twr: weightedTWR, twr_ann, xirr, available: true };
  }

  return result;
}

function buildConsolidated(wrappers: WrapperPeriodPerformance[]): ConsolidatedPerformance {
  const activeAUM = wrappers.filter((w) => !w.is_closed).reduce((s, w) => s + w.aum, 0);
  const hasClosed = wrappers.some((w) => w.is_closed);
  return {
    wrappers,
    portfolio: weightedPortfolio(wrappers),
    total_aum: activeAUM,
    note: hasClosed
      ? "Closed / transferred accounts are included in the 5-year portfolio return."
      : "",
  };
}

// ── Supabase fetch ────────────────────────────────────────────────────────────

async function fetchFromSupabase(clientId: string): Promise<ConsolidatedPerformance> {
  const { data: taxWrappers, error } = await supabase
    .from("tax_wrappers")
    .select("id, wrapper_type, platform_name, is_active, closed_date")
    .eq("client_id", clientId)
    .order("is_active", { ascending: false });

  if (error) throw error;
  if (!taxWrappers?.length) {
    return buildConsolidated([]);
  }

  const wrappers = await Promise.all(
    taxWrappers.map(async (w) => {
      const [{ data: vals }, { data: txns }] = await Promise.all([
        supabase
          .from("valuations")
          .select("valuation_date, market_value")
          .eq("tax_wrapper_id", w.id)
          .order("valuation_date"),
        supabase
          .from("transactions")
          .select(
            `trade_date, net_amount, is_book_over, transaction_type,
             sub_accounts!inner(tax_wrapper_id)`,
          )
          .eq("sub_accounts.tax_wrapper_id", w.id)
          .order("trade_date"),
      ]);

      const valuationPoints = (vals ?? []).map((v) => ({
        date:  new Date(v.valuation_date),
        value: Number(v.market_value),
      }));

      const cashFlowEvents = ((txns ?? []) as any[]).map((t) => ({
        date: new Date(t.trade_date),
        amount:
          ["CONTRIBUTION", "TRANSFER_IN_CASH", "BUY"].includes(t.transaction_type)
            ? -Number(t.net_amount)
            : Number(t.net_amount),
        is_book_over: Boolean(t.is_book_over),
      }));

      const latestVal = valuationPoints.at(-1);
      const aum = w.is_active ? (latestVal?.value ?? 0) : 0;

      const periods: Record<ReturnPeriod, PeriodMetrics> = emptyPeriods();
      if (valuationPoints.length >= 2) {
        for (const [key, years] of Object.entries(PERIOD_YEARS) as [ReturnPeriod, number][]) {
          periods[key] = computeMetrics(valuationPoints, cashFlowEvents, years, key);
        }
      }

      return {
        wrapper_id:  w.id,
        wrapper_type: w.wrapper_type,
        platform:    w.platform_name ?? "Unknown",
        label:       `${w.wrapper_type} — ${w.platform_name ?? "Unknown"}`,
        aum,
        is_closed:   !w.is_active,
        closed_date: w.closed_date ?? undefined,
        periods,
      } satisfies WrapperPeriodPerformance;
    }),
  );

  return buildConsolidated(wrappers);
}

// ── Demo data (used only when Supabase is not configured) ─────────────────────

const DEMO: Record<string, WrapperPeriodPerformance[]> = {
  c1: [
    {
      wrapper_id: "w1", wrapper_type: "SIPP", platform: "Transact",
      label: "SIPP — Transact", aum: 1_420_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0108, twr_ann: 0.0108, xirr: null,  available: true },
        "6M": { twr: 0.0618, twr_ann: 0.0618, xirr: null,  available: true },
        "1Y": { twr: 0.1340, twr_ann: 0.1340, xirr: 0.128, available: true },
        "3Y": { twr: 0.3978, twr_ann: 0.1181, xirr: 0.114, available: true },
        "5Y": { twr: 0.6189, twr_ann: 0.1002, xirr: 0.097, available: true },
      },
    },
    {
      wrapper_id: "w2", wrapper_type: "ISA", platform: "Transact",
      label: "ISA — Transact", aum: 400_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0067, twr_ann: 0.0067, xirr: null,  available: true },
        "6M": { twr: 0.0387, twr_ann: 0.0387, xirr: null,  available: true },
        "1Y": { twr: 0.0830, twr_ann: 0.0830, xirr: 0.079, available: true },
        "3Y": { twr: 0.2397, twr_ann: 0.0742, xirr: 0.071, available: true },
        "5Y": { twr: 0.3996, twr_ann: 0.0697, xirr: 0.067, available: true },
      },
    },
    {
      wrapper_id: "w3", wrapper_type: "GIA", platform: "Finio",
      label: "GIA — Finio", aum: 850_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0078, twr_ann: 0.0078, xirr: null,  available: true },
        "6M": { twr: 0.0452, twr_ann: 0.0452, xirr: null,  available: true },
        "1Y": { twr: 0.0990, twr_ann: 0.0990, xirr: 0.094, available: true },
        "3Y": { twr: 0.2878, twr_ann: 0.0879, xirr: 0.084, available: true },
        "5Y": { twr: 0.4637, twr_ann: 0.0789, xirr: 0.076, available: true },
      },
    },
    {
      wrapper_id: "w4", wrapper_type: "OFFSHORE_BOND", platform: "RL360",
      label: "Offshore Bond — RL360", aum: 177_300, is_closed: false,
      periods: {
        "1M": { twr: 0.0057, twr_ann: 0.0057, xirr: null,  available: true },
        "6M": { twr: 0.0329, twr_ann: 0.0329, xirr: null,  available: true },
        "1Y": { twr: 0.0710, twr_ann: 0.0710, xirr: 0.067, available: true },
        "3Y": { twr: 0.1960, twr_ann: 0.0610, xirr: 0.058, available: true },
        "5Y": { twr: 0.3165, twr_ann: 0.0563, xirr: 0.054, available: true },
      },
    },
    {
      wrapper_id: "w_hist_1", wrapper_type: "ISA", platform: "Quilter",
      label: "ISA — Quilter (closed)", aum: 0,
      is_closed: true, closed_date: "2022-01-14", transferred_to: "Transact",
      periods: {
        "1M": { twr: 0, twr_ann: 0, xirr: null, available: false },
        "6M": { twr: 0, twr_ann: 0, xirr: null, available: false },
        "1Y": { twr: 0, twr_ann: 0, xirr: null, available: false },
        "3Y": { twr: 0, twr_ann: 0, xirr: null, available: false },
        "5Y": { twr: 0.1124, twr_ann: 0.0645, xirr: 0.062, available: true },
      },
    },
  ],
  c3: [
    {
      wrapper_id: "w5", wrapper_type: "SIPP", platform: "Quilter",
      label: "SIPP — Quilter", aum: 2_100_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0131, twr_ann: 0.0131, xirr: null,  available: true },
        "6M": { twr: 0.0748, twr_ann: 0.0748, xirr: null,  available: true },
        "1Y": { twr: 0.1580, twr_ann: 0.1580, xirr: 0.152, available: true },
        "3Y": { twr: 0.4808, twr_ann: 0.1395, xirr: 0.135, available: true },
        "5Y": { twr: 0.7608, twr_ann: 0.1190, xirr: 0.115, available: true },
      },
    },
    {
      wrapper_id: "w6", wrapper_type: "ISA", platform: "Quilter",
      label: "ISA — Quilter", aum: 800_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0099, twr_ann: 0.0099, xirr: null,  available: true },
        "6M": { twr: 0.0568, twr_ann: 0.0568, xirr: null,  available: true },
        "1Y": { twr: 0.1220, twr_ann: 0.1220, xirr: 0.117, available: true },
        "3Y": { twr: 0.3591, twr_ann: 0.1079, xirr: 0.104, available: true },
        "5Y": { twr: 0.5781, twr_ann: 0.0955, xirr: 0.092, available: true },
      },
    },
    {
      wrapper_id: "w7", wrapper_type: "GIA", platform: "Transact",
      label: "GIA — Transact", aum: 800_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0134, twr_ann: 0.0134, xirr: null,  available: true },
        "6M": { twr: 0.0770, twr_ann: 0.0770, xirr: null,  available: true },
        "1Y": { twr: 0.1630, twr_ann: 0.1630, xirr: 0.157, available: true },
        "3Y": { twr: 0.4998, twr_ann: 0.1445, xirr: 0.140, available: true },
        "5Y": { twr: 0.7912, twr_ann: 0.1228, xirr: 0.119, available: true },
      },
    },
  ],
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConsolidatedPerformance(clientId: string) {
  return useQuery<ConsolidatedPerformance>({
    queryKey:  ["consolidated-performance", clientId],
    queryFn:   async () => {
      if (!isSupabaseConfigured) {
        const demo = DEMO[clientId];
        if (!demo) {
          // No demo data and no Supabase — return empty
          return buildConsolidated([]);
        }
        return buildConsolidated(demo);
      }
      return fetchFromSupabase(clientId);
    },
    staleTime: 1000 * 60 * 15,
  });
}
