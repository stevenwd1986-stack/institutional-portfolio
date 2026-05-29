import { useQuery } from "@tanstack/react-query";
import { indexToBase100 } from "../performance";

type Period = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";

export interface BenchmarkSeries {
  key:    string;
  label:  string;
  points: { date: string; value: number }[];
}

const BENCHMARK_ANNUAL_RETURNS: Record<string, number> = {
  SP500:   0.243,
  FTSE100: 0.087,
  MSCI:    0.197,
};

const PERIOD_DAYS: Record<Period, number> = {
  "1M": 30, "3M": 91, "6M": 182, "1Y": 365, "3Y": 1095, "5Y": 1825, "ALL": 2555,
};

function generateBenchmark(key: string, periodDays: number) {
  const annualReturn = BENCHMARK_ANNUAL_RETURNS[key] ?? 0.1;
  const dailyReturn  = Math.pow(1 + annualReturn, 1 / 365) - 1;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - periodDays);

  const raw: { date: Date; value: number }[] = [];
  let value = 1000;
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const noise = 1 + (Math.random() - 0.5) * 0.015;
      value = value * (1 + dailyReturn) * noise;
      raw.push({ date: new Date(d), value });
    }
  }

  const indexed = indexToBase100(raw);
  return indexed.map((pt) => ({ date: pt.date.toISOString().slice(0, 10), value: pt.value }));
}

const LABELS: Record<string, string> = {
  SP500: "S&P 500", FTSE100: "FTSE 100", MSCI: "MSCI World",
};

export function useBenchmarks(keys: string[], period: Period) {
  return useQuery<BenchmarkSeries[]>({
    queryKey: ["benchmarks", keys.sort().join(","), period],
    queryFn: async () => {
      const days = PERIOD_DAYS[period];
      return keys.map((key) => ({
        key,
        label:  LABELS[key] ?? key,
        points: generateBenchmark(key, days),
      }));
    },
    staleTime: 1000 * 60 * 15,
    enabled: keys.length > 0,
  });
}
