export interface ValuationPoint {
  date: Date;
  value: number;
}

export interface CashFlowEvent {
  date: Date;
  /** Positive = contribution (cash in), negative = withdrawal (cash out) */
  amount: number;
  /**
   * If true, this is a platform book-over (transfer in-specie). It adjusts
   * the beginning value of the next sub-period but is NOT counted as an
   * external cash flow in the HPR formula.
   */
  is_book_over: boolean;
}

/**
 * TWR — Time-Weighted Return using Modified Dietz with sub-period chain-linking.
 *
 * Sub-periods are broken at every external cash flow event. Book-over transfers
 * adjust BV of the next period without appearing as a cash flow — this correctly
 * isolates manager performance from transfer timing.
 */
export function calculateTWR(
  valuations: ValuationPoint[],
  cashFlows: CashFlowEvent[],
  periodStart: Date,
  periodEnd: Date
): number | null {
  if (valuations.length < 2) return null;

  const sortedVals = [...valuations].sort((a, b) => a.date.getTime() - b.date.getTime());
  const externalCFs = cashFlows
    .filter((cf) => !cf.is_book_over)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const breakDates = [
    periodStart,
    ...externalCFs.map((cf) => cf.date),
    periodEnd,
  ].sort((a, b) => a.getTime() - b.getTime());

  const uniqueBreaks = breakDates.filter(
    (d, i) => i === 0 || d.getTime() !== breakDates[i - 1].getTime()
  );

  function interpValue(date: Date): number {
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
  for (let i = 0; i < uniqueBreaks.length - 1; i++) {
    const start = uniqueBreaks[i];
    const end   = uniqueBreaks[i + 1];
    const bv    = interpValue(start);
    const ev    = interpValue(end);

    if (bv <= 0) continue;

    const periodMs = end.getTime() - start.getTime();

    const periodCFs = externalCFs.filter(
      (cf) => cf.date > start && cf.date <= end
    );

    const cf = periodCFs.reduce((s, c) => s + c.amount, 0);

    // Modified Dietz: weight each CF by fraction of period it was invested
    const cfWeighted = periodCFs.reduce((s, c) => {
      const remainingMs = end.getTime() - c.date.getTime();
      const w = periodMs > 0 ? remainingMs / periodMs : 0.5;
      return s + c.amount * w;
    }, 0);

    const denominator = bv + cfWeighted;
    if (Math.abs(denominator) < 0.01) continue;

    const hpr = (ev - bv - cf) / denominator;
    twr *= 1 + hpr;
  }

  return twr - 1;
}
