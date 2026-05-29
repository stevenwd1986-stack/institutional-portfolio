export { calculateXIRR }                              from "./xirr";
export { calculateTWR }                               from "./twr";
export { calculateCAGR }                              from "./cagr";
export { calculateBlendedBenchmark, indexToBase100 }  from "./benchmark";
export { validatePerformanceMetrics, reconcileLedger } from "./validation";

export type { CashFlow }                              from "./xirr";
export type { ValuationPoint, CashFlowEvent }         from "./twr";
export type { CAGRInput }                             from "./cagr";
export type { BenchmarkWeight, BenchmarkPricePoint, IndexedPoint } from "./benchmark";
export type { PerformanceMetrics, LedgerEntryInput, ReconciliationResult } from "./validation";
