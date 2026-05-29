import { useQuery } from "@tanstack/react-query";
import { indexToBase100 } from "../performance";

type Period = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";

export interface PerformanceSeries {
  wrapper_type: string;
  points: { date: string; value: number }[];
}

export interface PerformanceData {
  series: PerformanceSeries[];
  metrics: {
    twr: number | null;
    xirr: number | null;
    cagr: number | null;
  };
}

function generateDemoSeries(wrapperType: string, periodDays: number, baseValue: number, annualReturn: number) {
  const points: { date: string; value: number }[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - periodDays);

  let value = baseValue;
  const dailyReturn = Math.pow(1 + annualReturn, 1 / 365) - 1;

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    // Weekdays only
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const noise = 1 + (Math.random() - 0.5) * 0.012;
      value = value * (1 + dailyReturn) * noise;
      points.push({ date: d.toISOString().slice(0, 10), value: Math.round(value * 100) / 100 });
    }
  }
  return points;
}

const PERIOD_DAYS: Record<Period, number> = {
  "1M": 30, "3M": 91, "6M": 182, "1Y": 365, "3Y": 1095, "5Y": 1825, "ALL": 2555,
};

const WRAPPER_RETURNS: Record<string, number> = {
  SIPP: 0.134, ISA: 0.083, GIA: 0.099, OFFSHORE_BOND: 0.071,
};

const WRAPPER_BASE: Record<string, number> = {
  SIPP: 1_420_000, ISA: 400_000, GIA: 850_000, OFFSHORE_BOND: 177_300,
};

export function usePerformance(clientId: string, period: Period) {
  return useQuery<PerformanceData>({
    queryKey: ["performance", clientId, period],
    queryFn: async () => {
      const days = PERIOD_DAYS[period];

      const wrapperTypes = clientId === "c1" || clientId === "c3"
        ? ["SIPP", "ISA", "GIA", "OFFSHORE_BOND"]
        : ["SIPP", "ISA"];

      const series: PerformanceSeries[] = wrapperTypes.map((wt) => {
        const raw = generateDemoSeries(wt, days, WRAPPER_BASE[wt] ?? 500_000, WRAPPER_RETURNS[wt] ?? 0.08);
        const indexed = indexToBase100(raw.map((p) => ({ date: new Date(p.date), value: p.value })));
        return {
          wrapper_type: wt,
          points: indexed.map((pt) => ({ date: pt.date.toISOString().slice(0, 10), value: pt.value })),
        };
      });

      return {
        series,
        metrics: { twr: 0.112, xirr: 0.108, cagr: 0.104 },
      };
    },
    staleTime: 1000 * 60 * 15,
  });
}
