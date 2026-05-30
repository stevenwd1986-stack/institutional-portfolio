import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { calculateTWR }  from "../performance/twr";
import { calculateXIRR } from "../performance/xirr";
import { calculateCAGR } from "../performance/cagr";
import { indexToBase100 } from "../performance";

type Period = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";

export interface PerformanceSeries {
  wrapper_type: string;
  points: { date: string; value: number }[];
}

export interface PerformanceData {
  series: PerformanceSeries[];
  metrics: {
    twr:  number | null;
    xirr: number | null;
    cagr: number | null;
  };
}

// ── Period helpers ────────────────────────────────────────────────────────────

function periodStartDate(period: Period): Date {
  const d = new Date();
  switch (period) {
    case "1M":  d.setMonth(d.getMonth() - 1);       break;
    case "3M":  d.setMonth(d.getMonth() - 3);       break;
    case "6M":  d.setMonth(d.getMonth() - 6);       break;
    case "1Y":  d.setFullYear(d.getFullYear() - 1); break;
    case "3Y":  d.setFullYear(d.getFullYear() - 3); break;
    case "5Y":  d.setFullYear(d.getFullYear() - 5); break;
    case "ALL": d.setFullYear(d.getFullYear() - 20); break;
  }
  return d;
}

// ── Supabase fetch ────────────────────────────────────────────────────────────

async function fetchFromSupabase(clientId: string, period: Period): Promise<PerformanceData> {
  const pStart   = periodStartDate(period);
  const pEnd     = new Date();
  const startStr = pStart.toISOString().slice(0, 10);

  // 1. Fetch active wrappers for this client
  const { data: wrappers, error: wErr } = await supabase
    .from("tax_wrappers")
    .select("id, wrapper_type")
    .eq("client_id", clientId)
    .eq("is_active", true);

  if (wErr) throw wErr;
  if (!wrappers?.length) {
    return { series: [], metrics: { twr: null, xirr: null, cagr: null } };
  }

  // 2. For each wrapper, fetch valuations and transactions in the period
  const wrapperData = await Promise.all(
    wrappers.map(async (w) => {
      const [{ data: vals }, { data: txns }] = await Promise.all([
        supabase
          .from("valuations")
          .select("valuation_date, market_value")
          .eq("tax_wrapper_id", w.id)
          .gte("valuation_date", startStr)
          .order("valuation_date"),
        supabase
          .from("transactions")
          .select(
            `trade_date, net_amount, is_book_over, transaction_type,
             sub_accounts!inner(tax_wrapper_id)`,
          )
          .eq("sub_accounts.tax_wrapper_id", w.id)
          .gte("trade_date", startStr)
          .order("trade_date"),
      ]);

      return { wrapper: w, vals: vals ?? [], txns: txns ?? [] };
    }),
  );

  // 3. Build indexed series per wrapper
  const series: PerformanceSeries[] = [];
  const allTWRs:  { twr: number; aum: number }[] = [];

  for (const { wrapper, vals, txns } of wrapperData) {
    if (vals.length < 2) continue;

    const valPoints = vals.map((v) => ({
      date:  new Date(v.valuation_date),
      value: Number(v.market_value),
    }));

    const cfEvents = (txns as any[]).map((t) => ({
      date:         new Date(t.trade_date),
      amount:       ["CONTRIBUTION", "TRANSFER_IN_CASH", "BUY"].includes(t.transaction_type)
                      ? -Number(t.net_amount)
                      : Number(t.net_amount),
      is_book_over: Boolean(t.is_book_over),
    }));

    // Index to base 100
    const indexed = indexToBase100(valPoints);
    series.push({
      wrapper_type: wrapper.wrapper_type,
      points: indexed.map((pt) => ({
        date:  pt.date.toISOString().slice(0, 10),
        value: pt.value,
      })),
    });

    // Accumulate TWR for portfolio-level metric
    const twr = calculateTWR(valPoints, cfEvents, pStart, pEnd);
    const aum = valPoints.at(-1)?.value ?? 0;
    if (twr !== null && aum > 0) allTWRs.push({ twr, aum });
  }

  // 4. Compute portfolio-level metrics (AUM-weighted TWR)
  let twr:  number | null = null;
  let xirr: number | null = null;
  let cagr: number | null = null;

  if (allTWRs.length > 0) {
    const totalAUM = allTWRs.reduce((s, w) => s + w.aum, 0);
    twr = allTWRs.reduce((s, w) => s + (w.aum / totalAUM) * w.twr, 0);
  }

  // XIRR: aggregate cash flows across all wrappers + total AUM as terminal value
  const xirrCFs: { date: Date; amount: number }[] = [];
  for (const { vals, txns } of wrapperData) {
    for (const t of txns as any[]) {
      if (!t.is_book_over) {
        xirrCFs.push({
          date:   new Date(t.trade_date),
          amount: ["CONTRIBUTION", "TRANSFER_IN_CASH", "BUY"].includes(t.transaction_type)
            ? -Number(t.net_amount)
            : Number(t.net_amount),
        });
      }
    }
    const latestVal = vals.at(-1);
    if (latestVal) xirrCFs.push({ date: pEnd, amount: Number(latestVal.market_value) });
  }
  if (xirrCFs.length >= 2) xirr = calculateXIRR(xirrCFs);

  // CAGR: from earliest to latest total portfolio value
  const allFirstVals = wrapperData.flatMap(({ vals }) => vals.slice(0, 1));
  const allLastVals  = wrapperData.flatMap(({ vals }) => vals.slice(-1));
  const initialTotal = allFirstVals.reduce((s, v) => s + Number(v.market_value), 0);
  const finalTotal   = allLastVals.reduce( (s, v) => s + Number(v.market_value), 0);

  if (initialTotal > 0 && finalTotal > 0) {
    cagr = calculateCAGR({
      initialValue: initialTotal,
      finalValue:   finalTotal,
      startDate:    pStart,
      endDate:      pEnd,
    });
  }

  return { series, metrics: { twr, xirr, cagr } };
}

// ── Demo helpers (used only when Supabase is not configured) ──────────────────

function generateDemoSeries(
  _wrapperType: string,
  periodDays:   number,
  baseValue:    number,
  annualReturn: number,
) {
  const points: { date: string; value: number }[] = [];
  const today  = new Date();
  const start  = new Date(today);
  start.setDate(start.getDate() - periodDays);

  let value       = baseValue;
  const dailyRet  = Math.pow(1 + annualReturn, 1 / 365) - 1;

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const noise = 1 + (Math.random() - 0.5) * 0.012;
      value = value * (1 + dailyRet) * noise;
      points.push({ date: d.toISOString().slice(0, 10), value: Math.round(value * 100) / 100 });
    }
  }
  return points;
}

const PERIOD_DAYS: Record<Period, number> = {
  "1M": 30, "3M": 91, "6M": 182, "1Y": 365, "3Y": 1095, "5Y": 1825, "ALL": 2555,
};

const DEMO_WRAPPERS: Record<string, { type: string; annualReturn: number; base: number }[]> = {
  c1: [
    { type: "SIPP",          annualReturn: 0.134, base: 1_420_000 },
    { type: "ISA",           annualReturn: 0.083, base: 400_000   },
    { type: "GIA",           annualReturn: 0.099, base: 850_000   },
    { type: "OFFSHORE_BOND", annualReturn: 0.071, base: 177_300   },
  ],
  c3: [
    { type: "SIPP",          annualReturn: 0.158, base: 2_100_000 },
    { type: "ISA",           annualReturn: 0.122, base: 800_000   },
    { type: "GIA",           annualReturn: 0.163, base: 1_100_000 },
    { type: "OFFSHORE_BOND", annualReturn: 0.102, base: 210_500   },
  ],
};

function buildDemoData(clientId: string, period: Period): PerformanceData {
  const wrappers = DEMO_WRAPPERS[clientId];
  if (!wrappers) return { series: [], metrics: { twr: null, xirr: null, cagr: null } };

  const days = PERIOD_DAYS[period];
  const series = wrappers.map(({ type, annualReturn, base }) => ({
    wrapper_type: type,
    points: generateDemoSeries(type, days, base, annualReturn),
  }));

  return { series, metrics: { twr: 0.112, xirr: 0.108, cagr: 0.104 } };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePerformance(clientId: string, period: Period) {
  return useQuery<PerformanceData>({
    queryKey:  ["performance", clientId, period],
    queryFn:   async () => {
      if (!isSupabaseConfigured) return buildDemoData(clientId, period);
      return fetchFromSupabase(clientId, period);
    },
    staleTime: 1000 * 60 * 15,
  });
}
