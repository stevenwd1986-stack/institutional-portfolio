import { useQuery } from "@tanstack/react-query";

export interface HoldingDetail {
  id:              string;
  asset_name:      string;
  isin:            string | null;
  asset_class:     string;
  units:           number;
  price:           number;
  market_value:    number;
  cost_basis:      number;
  unrealised_gain: number;
  pct_gain:        number;
}

export interface GIATaxDetails {
  type:              "GIA";
  unrealised_gains:  number;
  cgt_annual_exempt: number;
  taxable_gains:     number;
  tax_basic:         number;
  tax_higher:        number;
  position_gains: { name: string; gain: number; cost: number }[];
}

export interface OffshoresBondTaxDetails {
  type:                  "OFFSHORE_BOND";
  total_premiums:        number;
  chargeable_event_gain: number;
  annual_allowance_5pct: number;
  years_held:            number;
  cumulative_allowance:  number;
  allowance_used:        number;
  allowance_remaining:   number;
  top_sliced_gain:       number;
}

export interface SIPPTaxDetails {
  type:                "SIPP";
  uncrystallised:      number;
  drawdown:            number;
  annual_allowance:    number;
  allowance_used:      number;
  allowance_remaining: number;
  pcls_available:      number;
  pcls_max:            number;
}

export interface ISATaxDetails {
  type:                      "ISA";
  total_subscribed:          number;
  tax_free_growth:           number;
  current_year_subscription: number;
  subscription_limit:        number;
  subscription_remaining:    number;
}

export type TaxDetails =
  | GIATaxDetails
  | OffshoresBondTaxDetails
  | SIPPTaxDetails
  | ISATaxDetails;

export interface WrapperDetail {
  id:           string;
  client_id:    string;
  wrapper_type: "SIPP" | "ISA" | "GIA" | "OFFSHORE_BOND";
  platform:     string;
  value:        number;
  cost_basis:   number;
  performance_1y: number;
  twr:          number;
  xirr:         number;
  cagr:         number;
  holdings:     HoldingDetail[];
  tax:          TaxDetails;
}

const DEMO_WRAPPERS: Record<string, WrapperDetail> = {
  // ── James Thornton — SIPP (w1) ────────────────────────────────────────────
  w1: {
    id: "w1", client_id: "c1", wrapper_type: "SIPP", platform: "Transact",
    value: 1_420_000, cost_basis: 980_000, performance_1y: 0.134, twr: 0.128, xirr: 0.119, cagr: 0.113,
    holdings: [
      { id: "h1-1", asset_name: "Vanguard LifeStrategy 80% Equity",    isin: "GB00B4PQW151", asset_class: "MIXED",        units: 35_420, price: 24.80,  market_value: 878_416, cost_basis: 620_000, unrealised_gain: 258_416, pct_gain: 0.417 },
      { id: "h1-2", asset_name: "Baillie Gifford Managed Fund",         isin: "GB0006059330", asset_class: "MIXED",        units:  8_240, price: 63.50,  market_value: 523_240, cost_basis: 355_000, unrealised_gain: 168_240, pct_gain: 0.474 },
      { id: "h1-3", asset_name: "Cash (GBP)",                           isin: null,           asset_class: "CASH",         units:  18_344, price: 1.00, market_value:  18_344, cost_basis:  18_344, unrealised_gain:       0, pct_gain: 0.000 },
    ],
    tax: {
      type: "SIPP",
      uncrystallised:      1_240_000,
      drawdown:              180_000,
      annual_allowance:       60_000,
      allowance_used:         35_000,
      allowance_remaining:    25_000,
      pcls_available:        268_275,  // capped at standard PCLS limit
      pcls_max:              268_275,
    },
  },

  // ── James Thornton — ISA (w2) ─────────────────────────────────────────────
  w2: {
    id: "w2", client_id: "c1", wrapper_type: "ISA", platform: "Transact",
    value: 400_000, cost_basis: 360_000, performance_1y: 0.083, twr: 0.079, xirr: 0.075, cagr: 0.071,
    holdings: [
      { id: "h2-1", asset_name: "Vanguard LifeStrategy 60% Equity", isin: "GB00B3TYHH97", asset_class: "MIXED",        units: 8_642, price: 27.30, market_value: 235_927, cost_basis: 210_000, unrealised_gain: 25_927, pct_gain: 0.124 },
      { id: "h2-2", asset_name: "iShares UK Gilts All Stocks",      isin: "IE00B7LFXY77", asset_class: "FIXED_INCOME", units: 5_430, price: 16.50, market_value:  89_595, cost_basis:  97_000, unrealised_gain: -7_405, pct_gain: -0.076 },
      { id: "h2-3", asset_name: "Fidelity Index World Fund",        isin: "GB00BJS8SF95", asset_class: "EQUITY",       units: 4_120, price: 18.05, market_value:  74_366, cost_basis:  53_000, unrealised_gain: 21_366, pct_gain: 0.403 },
    ],
    tax: {
      type: "ISA",
      total_subscribed:          360_000,
      tax_free_growth:            40_000,
      current_year_subscription:  14_500,
      subscription_limit:         20_000,
      subscription_remaining:      5_500,
    },
  },

  // ── James Thornton — GIA (w3) ─────────────────────────────────────────────
  w3: {
    id: "w3", client_id: "c1", wrapper_type: "GIA", platform: "Finio",
    value: 850_000, cost_basis: 720_000, performance_1y: 0.099, twr: 0.094, xirr: 0.088, cagr: 0.082,
    holdings: [
      { id: "h3-1", asset_name: "Vanguard FTSE All-World ETF",      isin: "IE00B3RBWM25", asset_class: "EQUITY",  units: 2_847, price:  85.40, market_value: 243_074, cost_basis: 195_000, unrealised_gain: 48_074, pct_gain: 0.247 },
      { id: "h3-2", asset_name: "iShares Core MSCI Emerging Markets",isin: "IE00BKM4GZ66", asset_class: "EQUITY",  units: 4_125, price:  53.20, market_value: 219_450, cost_basis: 197_250, unrealised_gain: 22_200, pct_gain: 0.113 },
      { id: "h3-3", asset_name: "SPDR S&P 500 ETF Trust",           isin: "IE00B6YX5C33", asset_class: "EQUITY",  units: 1_280, price: 196.80, market_value: 251_904, cost_basis: 205_000, unrealised_gain: 46_904, pct_gain: 0.229 },
      { id: "h3-4", asset_name: "Fidelity Index UK Fund",           isin: "GB00BJS8SH10", asset_class: "EQUITY",  units: 8_960, price:  15.07, market_value: 135_027, cost_basis: 122_750, unrealised_gain: 12_277, pct_gain: 0.100 },
    ],
    tax: {
      type: "GIA",
      unrealised_gains:   129_455,
      cgt_annual_exempt:    3_000,
      taxable_gains:      126_455,
      tax_basic:           25_291,   // 20%
      tax_higher:          30_349,   // 24%
      position_gains: [
        { name: "Vanguard FTSE All-World",         gain: 48_074, cost: 195_000 },
        { name: "SPDR S&P 500 ETF",                gain: 46_904, cost: 205_000 },
        { name: "iShares Core MSCI Emerging",      gain: 22_200, cost: 197_250 },
        { name: "Fidelity Index UK",               gain: 12_277, cost: 122_750 },
      ],
    },
  },

  // ── James Thornton — Offshore Bond (w4) ──────────────────────────────────
  w4: {
    id: "w4", client_id: "c1", wrapper_type: "OFFSHORE_BOND", platform: "RL360",
    value: 177_300, cost_basis: 145_000, performance_1y: 0.071, twr: 0.068, xirr: 0.064, cagr: 0.059,
    holdings: [
      { id: "h4-1", asset_name: "RL360 Managed Portfolio (Growth)",   isin: null, asset_class: "MIXED", units: 12_450, price: 9.87,  market_value: 122_882, cost_basis: 100_500, unrealised_gain: 22_382, pct_gain: 0.223 },
      { id: "h4-2", asset_name: "RL360 Managed Portfolio (Balanced)", isin: null, asset_class: "MIXED", units:  6_890, price: 7.905, market_value:  54_476, cost_basis:  44_500, unrealised_gain:  9_976, pct_gain: 0.224 },
    ],
    tax: {
      type:                  "OFFSHORE_BOND",
      total_premiums:        145_000,
      chargeable_event_gain:  32_300,
      annual_allowance_5pct:   7_250,  // 5% of £145,000
      years_held:                  8,
      cumulative_allowance:   58_000,  // 8 × £7,250
      allowance_used:              0,  // no withdrawals made
      allowance_remaining:    58_000,
      top_sliced_gain:         4_038,  // £32,300 / 8
    },
  },

  // ── Robert Ashworth — SIPP (w5) ───────────────────────────────────────────
  w5: {
    id: "w5", client_id: "c3", wrapper_type: "SIPP", platform: "Quilter",
    value: 2_100_000, cost_basis: 1_600_000, performance_1y: 0.158, twr: 0.149, xirr: 0.141, cagr: 0.133,
    holdings: [
      { id: "h5-1", asset_name: "Baillie Gifford Global Alpha",     isin: "GB0006054231", asset_class: "EQUITY",  units: 42_800, price: 28.60, market_value: 1_224_080, cost_basis: 900_000, unrealised_gain: 324_080, pct_gain: 0.360 },
      { id: "h5-2", asset_name: "Fundsmith Equity Fund",            isin: "GB00B4Q5X527", asset_class: "EQUITY",  units:  9_840, price: 59.50, market_value:   585_480, cost_basis: 480_000, unrealised_gain: 105_480, pct_gain: 0.220 },
      { id: "h5-3", asset_name: "Cash (GBP)",                       isin: null,           asset_class: "CASH",    units: 290_440, price: 1.00, market_value:   290_440, cost_basis: 220_000, unrealised_gain:  70_440, pct_gain: 0.320 },
    ],
    tax: {
      type: "SIPP",
      uncrystallised:    1_850_000,
      drawdown:            250_000,
      annual_allowance:     60_000,
      allowance_used:       60_000,  // fully used
      allowance_remaining:       0,
      pcls_available:      268_275,
      pcls_max:            268_275,
    },
  },
};

function fallbackWrapper(clientId: string, wrapperId: string): WrapperDetail {
  return {
    id: wrapperId, client_id: clientId, wrapper_type: "SIPP", platform: "Transact",
    value: 500_000, cost_basis: 400_000, performance_1y: 0.09, twr: 0.086, xirr: 0.081, cagr: 0.077,
    holdings: [],
    tax: {
      type: "SIPP",
      uncrystallised: 500_000, drawdown: 0,
      annual_allowance: 60_000, allowance_used: 20_000, allowance_remaining: 40_000,
      pcls_available: 125_000, pcls_max: 268_275,
    },
  };
}

export function useWrapper(clientId: string, wrapperId: string) {
  return useQuery<WrapperDetail>({
    queryKey: ["wrapper", clientId, wrapperId],
    queryFn:  async () => DEMO_WRAPPERS[wrapperId] ?? fallbackWrapper(clientId, wrapperId),
    staleTime: 1000 * 60 * 5,
  });
}
