export interface CashFlow {
  date: Date;
  /** Negative = cash out (investment), positive = cash in (return/sale proceeds) */
  amount: number;
}

function yearFraction(d0: Date, d1: Date): number {
  return (d1.getTime() - d0.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function npv(cashFlows: CashFlow[], rate: number): number {
  const t0 = cashFlows[0].date;
  return cashFlows.reduce((sum, cf) => {
    const t = yearFraction(t0, cf.date);
    return sum + cf.amount / Math.pow(1 + rate, t);
  }, 0);
}

function npvDerivative(cashFlows: CashFlow[], rate: number): number {
  const t0 = cashFlows[0].date;
  return cashFlows.reduce((sum, cf) => {
    const t = yearFraction(t0, cf.date);
    if (t === 0) return sum;
    return sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * XIRR — internal rate of return for irregular cash flows.
 *
 * Book-over transfers (is_book_over = true on the Transaction row) must be
 * filtered out by the caller before passing the series here. They are not
 * economic events and must not appear as cash flows.
 *
 * Returns annualised rate as decimal (0.08 = 8%), or null if the series
 * cannot converge (e.g. all same-sign cash flows, degenerate series).
 */
export function calculateXIRR(
  cashFlows: CashFlow[],
  options: { maxIterations?: number; tolerance?: number; guess?: number } = {}
): number | null {
  const { maxIterations = 100, tolerance = 1e-7, guess = 0.1 } = options;

  if (cashFlows.length < 2) return null;
  const hasOutflow = cashFlows.some((cf) => cf.amount < 0);
  const hasInflow  = cashFlows.some((cf) => cf.amount > 0);
  if (!hasOutflow || !hasInflow) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    const f  = npv(sorted, rate);
    const df = npvDerivative(sorted, rate);

    if (Math.abs(df) < 1e-12) break;

    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < tolerance) return newRate;
    rate = newRate;

    if (!isFinite(rate) || rate <= -1) rate = -0.999;
  }

  // Bisection fallback for degenerate series
  let lo = -0.999, hi = 10.0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(sorted, mid) > 0) lo = mid; else hi = mid;
    if (hi - lo < tolerance) return (lo + hi) / 2;
  }

  return null;
}
