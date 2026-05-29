export interface PerformanceMetrics {
  xirr?: number | null;
  twr?: number | null;
  cagr?: number | null;
}

export interface LedgerEntryInput {
  transaction_id: string;
  side: "DEBIT" | "CREDIT";
  amount: number;
}

export interface ReconciliationResult {
  is_balanced: boolean;
  variance: number;
  unbalanced_transaction_ids: string[];
}

const BOUNDS = { min: -1.0, max: 5.0 };

/**
 * Throw with a descriptive message if any performance metric is outside
 * the sanity bounds (-100% to +500%), NaN, or non-finite.
 */
export function validatePerformanceMetrics(metrics: PerformanceMetrics): void {
  const check = (name: string, value: number | null | undefined) => {
    if (value == null) return;
    if (isNaN(value))     throw new Error(`${name} is NaN`);
    if (!isFinite(value)) throw new Error(`${name} is not finite: ${value}`);
    if (value < BOUNDS.min) throw new Error(`${name} below -100% floor: ${(value * 100).toFixed(1)}%`);
    if (value > BOUNDS.max) throw new Error(`${name} exceeds +500% ceiling: ${(value * 100).toFixed(1)}%`);
  };

  check("XIRR", metrics.xirr);
  check("TWR",  metrics.twr);
  check("CAGR", metrics.cagr);
}

/**
 * Verify that every transaction in the ledger entry set is balanced
 * (sum of debits = sum of credits, within £0.01 rounding tolerance).
 */
export function reconcileLedger(entries: LedgerEntryInput[]): ReconciliationResult {
  const txMap = new Map<string, { debits: number; credits: number }>();

  for (const entry of entries) {
    if (!txMap.has(entry.transaction_id)) {
      txMap.set(entry.transaction_id, { debits: 0, credits: 0 });
    }
    const rec = txMap.get(entry.transaction_id)!;
    if (entry.side === "DEBIT") rec.debits  += entry.amount;
    else                         rec.credits += entry.amount;
  }

  const unbalanced: string[] = [];
  let totalVariance = 0;

  txMap.forEach(({ debits, credits }, txId) => {
    const diff = Math.abs(debits - credits);
    if (diff > 0.01) {
      unbalanced.push(txId);
      totalVariance += diff;
    }
  });

  return {
    is_balanced: unbalanced.length === 0,
    variance: totalVariance,
    unbalanced_transaction_ids: unbalanced,
  };
}
