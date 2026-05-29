// ─── XIRR ──────────────────────────────────────────────────────────────────

export interface CashFlow {
  date: Date;
  amount: number;
}

function yearFraction(d0: Date, d1: Date): number {
  return (d1.getTime() - d0.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function npv(cfs: CashFlow[], rate: number): number {
  const t0 = cfs[0].date;
  return cfs.reduce((sum, cf) => sum + cf.amount / Math.pow(1 + rate, yearFraction(t0, cf.date)), 0);
}

function npvDeriv(cfs: CashFlow[], rate: number): number {
  const t0 = cfs[0].date;
  return cfs.reduce((sum, cf) => {
    const t = yearFraction(t0, cf.date);
    if (t === 0) return sum;
    return sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
  }, 0);
}

export function calculateXIRR(
  cashFlows: CashFlow[],
  opts: { maxIterations?: number; tolerance?: number; guess?: number } = {}
): number | null {
  const { maxIterations = 100, tolerance = 1e-7, guess = 0.1 } = opts;

  if (cashFlows.length < 2) return null;
  if (!cashFlows.some((cf) => cf.amount < 0) || !cashFlows.some((cf) => cf.amount > 0)) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());

  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    const f  = npv(sorted, rate);
    const df = npvDeriv(sorted, rate);
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (Math.abs(next - rate) < tolerance) return next;
    rate = next;
    if (!isFinite(rate) || rate <= -1) rate = -0.999;
  }

  let lo = -0.999, hi = 10.0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(sorted, mid) > 0) lo = mid; else hi = mid;
    if (hi - lo < tolerance) return (lo + hi) / 2;
  }
  return null;
}

// ─── TWR ───────────────────────────────────────────────────────────────────

export interface ValuationPoint { date: Date; value: number; }
export interface CashFlowEvent  { date: Date; amount: number; is_book_over: boolean; }

export function calculateTWR(
  valuations: ValuationPoint[],
  cashFlows: CashFlowEvent[],
  periodStart: Date,
  periodEnd: Date
): number | null {
  if (valuations.length < 2) return null;

  const sortedVals = [...valuations].sort((a, b) => a.date.getTime() - b.date.getTime());
  const sortedCFs  = [...cashFlows]
    .filter((cf) => !cf.is_book_over)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const breakDates = [
    periodStart,
    ...sortedCFs.map((cf) => cf.date),
    periodEnd,
  ].sort((a, b) => a.getTime() - b.getTime());

  const breaks = breakDates.filter((d, i) =>
    i === 0 || d.getTime() !== breakDates[i - 1].getTime()
  );

  function interp(date: Date): number {
    const exact = sortedVals.find((v) => v.date.getTime() === date.getTime());
    if (exact) return exact.value;
    const before = [...sortedVals].reverse().find((v) => v.date <= date);
    const after  = sortedVals.find((v) => v.date >= date);
    if (!before && after) return after.value;
    if (!after && before) return before.value;
    if (!before || !after) return 0;
    const span = after.date.getTime() - before.date.getTime();
    const frac = (date.getTime() - before.date.getTime()) / span;
    return before.value + frac * (after.value - before.value);
  }

  let twr = 1;
  for (let i = 0; i < breaks.length - 1; i++) {
    const start = breaks[i];
    const end   = breaks[i + 1];
    const bv    = interp(start);
    const ev    = interp(end);
    if (bv <= 0) continue;

    const periodMs = end.getTime() - start.getTime();
    const periodCFs = sortedCFs.filter((cf) => cf.date > start && cf.date <= end);
    const cf = periodCFs.reduce((s, c) => s + c.amount, 0);
    const cfWeighted = periodCFs.reduce((s, c) => {
      const w = periodMs > 0 ? (end.getTime() - c.date.getTime()) / periodMs : 0.5;
      return s + c.amount * w;
    }, 0);

    const denom = bv + cfWeighted;
    if (Math.abs(denom) < 0.01) continue;
    twr *= (1 + (ev - bv - cf) / denom);
  }
  return twr - 1;
}

// ─── CAGR ──────────────────────────────────────────────────────────────────

export function calculateCAGR(
  initialValue: number,
  finalValue: number,
  startDate: Date,
  endDate: Date
): number | null {
  const days = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  if (days < 30 || initialValue <= 0) return null;
  return Math.pow(finalValue / initialValue, 365.25 / days) - 1;
}
