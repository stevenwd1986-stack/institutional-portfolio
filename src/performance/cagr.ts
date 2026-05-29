export interface CAGRInput {
  /**
   * Must be the original pre-transfer cost basis, not the book-over transfer
   * price. Use PlatformTransfer.original_cost_basis for transferred holdings.
   */
  initialValue: number;
  finalValue: number;
  startDate: Date;
  endDate: Date;
}

/**
 * CAGR = (FV / IV)^(365.25 / days) - 1
 *
 * Returns null if the period is shorter than 30 days or initialValue ≤ 0,
 * since annualising over very short periods produces meaningless numbers.
 */
export function calculateCAGR({ initialValue, finalValue, startDate, endDate }: CAGRInput): number | null {
  if (initialValue <= 0) return null;

  const days = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  if (days < 30) return null;

  return Math.pow(finalValue / initialValue, 365.25 / days) - 1;
}
