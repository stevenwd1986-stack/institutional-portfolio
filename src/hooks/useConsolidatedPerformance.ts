import { useQuery } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReturnPeriod = "1M" | "6M" | "1Y" | "3Y" | "5Y";

export interface PeriodMetrics {
  twr:       number;         // total return for the period
  twr_ann:   number;         // annualised TWR (= twr for ≤1Y; CAGR equivalent for 3Y/5Y)
  xirr:      number | null;  // null when < 12 months of data
  available: boolean;        // false when wrapper was closed before this period starts
}

export interface WrapperPeriodPerformance {
  wrapper_id:      string;
  wrapper_type:    string;
  platform:        string;
  label:           string;   // e.g. "ISA — Transact"
  aum:             number;   // 0 for closed wrappers
  is_closed:       boolean;
  closed_date?:    string;
  transferred_to?: string;
  periods:         Record<ReturnPeriod, PeriodMetrics>;
}

export interface ConsolidatedPerformance {
  wrappers:  WrapperPeriodPerformance[];           // active + closed
  portfolio: Record<ReturnPeriod, PeriodMetrics>;  // AUM-weighted total
  total_aum: number;
  note:      string;  // e.g. "Closed accounts included in 3Y and 5Y portfolio return"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Annualise a total return over `years` years
function ann(totalReturn: number, years: number): number {
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

// Period definitions
const PERIOD_YEARS: Record<ReturnPeriod, number> = {
  "1M": 1 / 12,
  "6M": 0.5,
  "1Y": 1,
  "3Y": 3,
  "5Y": 5,
};

// ── Demo data ─────────────────────────────────────────────────────────────────
// Returns expressed as total-period TWR (not annualised).
// The closed Quilter ISA existed for ~5 yrs before Jan 2022 transfer —
// so it shows up in 5Y (partially) and 3Y (partially) but not 1Y/6M/1M.

const DEMO: Record<string, WrapperPeriodPerformance[]> = {

  // ── James Thornton (c1) ────────────────────────────────────────────────────
  c1: [
    {
      wrapper_id: "w1", wrapper_type: "SIPP", platform: "Transact",
      label: "SIPP — Transact", aum: 1_420_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0108, twr_ann: 0.0108, xirr: null,  available: true },
        "6M": { twr: 0.0618, twr_ann: 0.0618, xirr: null,  available: true },
        "1Y": { twr: 0.1340, twr_ann: 0.1340, xirr: 0.128, available: true },
        "3Y": { twr: 0.3978, twr_ann: 0.1181, xirr: 0.114, available: true },
        "5Y": { twr: 0.6189, twr_ann: 0.1002, xirr: 0.097, available: true },
      },
    },
    {
      wrapper_id: "w2", wrapper_type: "ISA", platform: "Transact",
      label: "ISA — Transact", aum: 400_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0067, twr_ann: 0.0067, xirr: null,  available: true },
        "6M": { twr: 0.0387, twr_ann: 0.0387, xirr: null,  available: true },
        "1Y": { twr: 0.0830, twr_ann: 0.0830, xirr: 0.079, available: true },
        "3Y": { twr: 0.2397, twr_ann: 0.0742, xirr: 0.071, available: true },
        "5Y": { twr: 0.3996, twr_ann: 0.0697, xirr: 0.067, available: true },
      },
    },
    {
      wrapper_id: "w3", wrapper_type: "GIA", platform: "Finio",
      label: "GIA — Finio", aum: 850_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0078, twr_ann: 0.0078, xirr: null,  available: true },
        "6M": { twr: 0.0452, twr_ann: 0.0452, xirr: null,  available: true },
        "1Y": { twr: 0.0990, twr_ann: 0.0990, xirr: 0.094, available: true },
        "3Y": { twr: 0.2878, twr_ann: 0.0879, xirr: 0.084, available: true },
        "5Y": { twr: 0.4637, twr_ann: 0.0789, xirr: 0.076, available: true },
      },
    },
    {
      wrapper_id: "w4", wrapper_type: "OFFSHORE_BOND", platform: "RL360",
      label: "Offshore Bond — RL360", aum: 177_300, is_closed: false,
      periods: {
        "1M": { twr: 0.0057, twr_ann: 0.0057, xirr: null,  available: true },
        "6M": { twr: 0.0329, twr_ann: 0.0329, xirr: null,  available: true },
        "1Y": { twr: 0.0710, twr_ann: 0.0710, xirr: 0.067, available: true },
        "3Y": { twr: 0.1960, twr_ann: 0.0610, xirr: 0.058, available: true },
        "5Y": { twr: 0.3165, twr_ann: 0.0563, xirr: 0.054, available: true },
      },
    },
    // ── CLOSED: Quilter ISA — transferred Jan 2022 (≈3.3 yrs ago)
    // Available for 5Y (partially) and shown as closed for 1M/6M/1Y/3Y
    {
      wrapper_id: "w_hist_1", wrapper_type: "ISA", platform: "Quilter",
      label: "ISA — Quilter (closed)", aum: 0,
      is_closed: true, closed_date: "2022-01-14", transferred_to: "Transact",
      periods: {
        "1M": { twr: 0, twr_ann: 0, xirr: null,  available: false },
        "6M": { twr: 0, twr_ann: 0, xirr: null,  available: false },
        "1Y": { twr: 0, twr_ann: 0, xirr: null,  available: false },
        "3Y": { twr: 0, twr_ann: 0, xirr: null,  available: false },
        // For the 5Y period it was live for ~1.7 yrs out of 5 — actual return over those 1.7y
        "5Y": { twr: 0.1124, twr_ann: 0.0645, xirr: 0.062, available: true },
      },
    },
  ],

  // ── Robert Ashworth (c3) ───────────────────────────────────────────────────
  c3: [
    {
      wrapper_id: "w5", wrapper_type: "SIPP", platform: "Quilter",
      label: "SIPP — Quilter", aum: 2_100_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0131, twr_ann: 0.0131, xirr: null,  available: true },
        "6M": { twr: 0.0748, twr_ann: 0.0748, xirr: null,  available: true },
        "1Y": { twr: 0.1580, twr_ann: 0.1580, xirr: 0.152, available: true },
        "3Y": { twr: 0.4808, twr_ann: 0.1395, xirr: 0.135, available: true },
        "5Y": { twr: 0.7608, twr_ann: 0.1190, xirr: 0.115, available: true },
      },
    },
    {
      wrapper_id: "w6", wrapper_type: "ISA", platform: "Quilter",
      label: "ISA — Quilter", aum: 800_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0099, twr_ann: 0.0099, xirr: null,  available: true },
        "6M": { twr: 0.0568, twr_ann: 0.0568, xirr: null,  available: true },
        "1Y": { twr: 0.1220, twr_ann: 0.1220, xirr: 0.117, available: true },
        "3Y": { twr: 0.3591, twr_ann: 0.1079, xirr: 0.104, available: true },
        "5Y": { twr: 0.5781, twr_ann: 0.0955, xirr: 0.092, available: true },
      },
    },
    {
      wrapper_id: "w7", wrapper_type: "GIA", platform: "Transact",
      label: "GIA — Transact", aum: 1_100_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0134, twr_ann: 0.0134, xirr: null,  available: true },
        "6M": { twr: 0.0770, twr_ann: 0.0770, xirr: null,  available: true },
        "1Y": { twr: 0.1630, twr_ann: 0.1630, xirr: 0.157, available: true },
        "3Y": { twr: 0.4998, twr_ann: 0.1445, xirr: 0.140, available: true },
        "5Y": { twr: 0.7912, twr_ann: 0.1228, xirr: 0.119, available: true },
      },
    },
    {
      wrapper_id: "w8", wrapper_type: "OFFSHORE_BOND", platform: "Canada Life",
      label: "Offshore Bond — Canada Life", aum: 210_500, is_closed: false,
      periods: {
        "1M": { twr: 0.0083, twr_ann: 0.0083, xirr: null,  available: true },
        "6M": { twr: 0.0479, twr_ann: 0.0479, xirr: null,  available: true },
        "1Y": { twr: 0.1020, twr_ann: 0.1020, xirr: 0.098, available: true },
        "3Y": { twr: 0.3041, twr_ann: 0.0925, xirr: 0.089, available: true },
        "5Y": { twr: 0.4916, twr_ann: 0.0832, xirr: 0.080, available: true },
      },
    },
    {
      wrapper_id: "w9", wrapper_type: "ISA", platform: "Transact",
      label: "ISA (APS) — Transact", aum: 145_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0080, twr_ann: 0.0080, xirr: null,  available: true },
        "6M": { twr: 0.0460, twr_ann: 0.0460, xirr: null,  available: true },
        "1Y": { twr: 0.0990, twr_ann: 0.0990, xirr: 0.095, available: true },
        "3Y": { twr: 0, twr_ann: 0, xirr: null, available: false }, // only opened 2023
        "5Y": { twr: 0, twr_ann: 0, xirr: null, available: false },
      },
    },
  ],
};

// ── AUM-weighted portfolio aggregate ─────────────────────────────────────────

function weightedPortfolio(
  wrappers: WrapperPeriodPerformance[]
): Record<ReturnPeriod, PeriodMetrics> {
  const periods: ReturnPeriod[] = ["1M", "6M", "1Y", "3Y", "5Y"];
  const result = {} as Record<ReturnPeriod, PeriodMetrics>;

  for (const p of periods) {
    // Include active wrappers only; for 3Y/5Y include closed ones with a weight proxy
    const active = wrappers.filter((w) => !w.is_closed && w.periods[p].available);
    const closed = wrappers.filter((w) => w.is_closed  && w.periods[p].available);

    const totalAUM = active.reduce((s, w) => s + w.aum, 0);
    if (totalAUM === 0) {
      result[p] = { twr: 0, twr_ann: 0, xirr: null, available: false };
      continue;
    }

    // Weight active wrappers by AUM
    let weightedTWR = active.reduce(
      (s, w) => s + (w.aum / totalAUM) * w.periods[p].twr, 0
    );

    // For longer periods, blend in the closed wrapper contribution (rough approximation)
    if (closed.length > 0 && (p === "3Y" || p === "5Y")) {
      const closedWeight = 0.08; // 8% blended weight for historical contribution
      weightedTWR = weightedTWR * (1 - closedWeight) +
        closed.reduce((s, w) => s + w.periods[p].twr, 0) / closed.length * closedWeight;
    }

    const years = PERIOD_YEARS[p];
    const annReturn = p === "1M" || p === "6M" ? weightedTWR : ann(weightedTWR, years);

    result[p] = {
      twr:       weightedTWR,
      twr_ann:   annReturn,
      xirr:      p === "1Y" || p === "3Y" || p === "5Y"
        ? active.reduce((s, w) => s + (w.aum / totalAUM) * (w.periods[p].xirr ?? 0), 0)
        : null,
      available: true,
    };
  }

  return result;
}

function buildConsolidated(wrappers: WrapperPeriodPerformance[]): ConsolidatedPerformance {
  const activeAUM  = wrappers.filter((w) => !w.is_closed).reduce((s, w) => s + w.aum, 0);
  const hasClosed  = wrappers.some((w) => w.is_closed);

  return {
    wrappers,
    portfolio: weightedPortfolio(wrappers),
    total_aum: activeAUM,
    note: hasClosed
      ? "Closed / transferred accounts are included in the 5-year portfolio return."
      : "",
  };
}

function generateFallback(clientId: string): ConsolidatedPerformance {
  const wrappers: WrapperPeriodPerformance[] = [
    {
      wrapper_id: `w-${clientId}-sipp`, wrapper_type: "SIPP", platform: "Transact",
      label: "SIPP — Transact", aum: 500_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0075, twr_ann: 0.0075, xirr: null,  available: true },
        "6M": { twr: 0.0430, twr_ann: 0.0430, xirr: null,  available: true },
        "1Y": { twr: 0.0900, twr_ann: 0.0900, xirr: 0.086, available: true },
        "3Y": { twr: 0.2690, twr_ann: 0.0826, xirr: 0.079, available: true },
        "5Y": { twr: 0.4319, twr_ann: 0.0745, xirr: 0.072, available: true },
      },
    },
    {
      wrapper_id: `w-${clientId}-isa`, wrapper_type: "ISA", platform: "Transact",
      label: "ISA — Transact", aum: 200_000, is_closed: false,
      periods: {
        "1M": { twr: 0.0049, twr_ann: 0.0049, xirr: null,  available: true },
        "6M": { twr: 0.0284, twr_ann: 0.0284, xirr: null,  available: true },
        "1Y": { twr: 0.0600, twr_ann: 0.0600, xirr: 0.057, available: true },
        "3Y": { twr: 0.1785, twr_ann: 0.0563, xirr: 0.054, available: true },
        "5Y": { twr: 0.3064, twr_ann: 0.0546, xirr: 0.052, available: true },
      },
    },
  ];
  return buildConsolidated(wrappers);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConsolidatedPerformance(clientId: string) {
  return useQuery<ConsolidatedPerformance>({
    queryKey:  ["consolidated-performance", clientId],
    queryFn:   async () => {
      const wrappers = DEMO[clientId];
      if (!wrappers) return generateFallback(clientId);
      return buildConsolidated(wrappers);
    },
    staleTime: 1000 * 60 * 15,
  });
}
