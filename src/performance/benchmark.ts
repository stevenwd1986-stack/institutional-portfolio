export interface BenchmarkWeight {
  benchmarkId: string;
  weight: number;
}

export interface BenchmarkPricePoint {
  benchmarkId: string;
  date: Date;
  level: number;
}

export interface IndexedPoint {
  date: Date;
  value: number;
}

/**
 * Compute a daily blended benchmark from weighted constituents.
 * Each constituent is normalised to 1.0 at first available date, then
 * weighted and combined. Weights must sum to 1.0 (±0.001 tolerance).
 */
export function calculateBlendedBenchmark(
  weights: BenchmarkWeight[],
  prices: BenchmarkPricePoint[]
): IndexedPoint[] {
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.001) {
    throw new Error(`Benchmark weights must sum to 1.0, got ${totalWeight.toFixed(4)}`);
  }

  const allDateStrs = [...new Set(prices.map((p) => p.date.toISOString().slice(0, 10)))]
    .sort();

  const baseByBenchmark: Record<string, number> = {};
  allDateStrs.forEach((dateStr) => {
    prices
      .filter((p) => p.date.toISOString().slice(0, 10) === dateStr)
      .forEach((p) => {
        if (!(p.benchmarkId in baseByBenchmark)) {
          baseByBenchmark[p.benchmarkId] = p.level;
        }
      });
  });

  const priceMap = new Map<string, number>();
  prices.forEach((p) => {
    priceMap.set(`${p.benchmarkId}|${p.date.toISOString().slice(0, 10)}`, p.level);
  });

  return allDateStrs.map((dateStr) => {
    const blended = weights.reduce((sum, { benchmarkId, weight }) => {
      const base    = baseByBenchmark[benchmarkId];
      const current = priceMap.get(`${benchmarkId}|${dateStr}`) ?? base;
      if (!base) return sum;
      return sum + weight * (current / base);
    }, 0);
    return { date: new Date(dateStr), value: blended };
  });
}

/**
 * Re-index any value series so the first point = 100.
 * Used to normalise wrappers and benchmarks onto the same chart axis.
 */
export function indexToBase100(series: IndexedPoint[]): IndexedPoint[] {
  if (series.length === 0) return [];
  const base = series[0].value;
  if (base === 0) throw new Error("Cannot index to base 100: first value is zero");
  return series.map((pt) => ({ date: pt.date, value: (pt.value / base) * 100 }));
}
