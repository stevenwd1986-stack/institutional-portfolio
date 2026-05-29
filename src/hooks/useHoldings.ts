import { useQuery } from "@tanstack/react-query";

export interface HoldingRow {
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
  wrapper_type:    string;
}

const DEMO_HOLDINGS: HoldingRow[] = [
  { id: "h1",  asset_name: "iShares Core MSCI World ETF",         isin: "IE00B4L5Y983", asset_class: "EQUITY",       units: 3_240,   price: 98.42,   market_value: 318_880,  cost_basis: 265_000, unrealised_gain: 53_880,  pct_gain: 0.203, wrapper_type: "SIPP" },
  { id: "h2",  asset_name: "Vanguard S&P 500 ETF (Acc)",          isin: "IE00BFMXXD54", asset_class: "EQUITY",       units: 8_100,   price: 98.12,   market_value: 794_772,  cost_basis: 620_000, unrealised_gain: 174_772, pct_gain: 0.282, wrapper_type: "SIPP" },
  { id: "h3",  asset_name: "Fidelity Global Dividend",            isin: "GB00B7778087", asset_class: "EQUITY",       units: 42_000,  price: 7.12,    market_value: 299_040,  cost_basis: 275_000, unrealised_gain: 24_040,  pct_gain: 0.087, wrapper_type: "SIPP" },
  { id: "h4",  asset_name: "Invesco Corporate Bond",              isin: "GB00B1XFGM25", asset_class: "FIXED_INCOME", units: 18_500,  price: 1.842,   market_value:  34_077,  cost_basis:  38_000, unrealised_gain:  -3_923, pct_gain: -0.103, wrapper_type: "SIPP" },
  { id: "h5",  asset_name: "Baillie Gifford American B Acc",      isin: "GB0006063233", asset_class: "EQUITY",       units: 14_200,  price: 10.34,   market_value: 146_828,  cost_basis: 110_000, unrealised_gain: 36_828,  pct_gain: 0.335, wrapper_type: "ISA" },
  { id: "h6",  asset_name: "Artemis UK Select",                   isin: "GB00B2PDCS86", asset_class: "EQUITY",       units: 82_000,  price: 3.12,    market_value: 255_840,  cost_basis: 250_000, unrealised_gain:  5_840,  pct_gain: 0.023, wrapper_type: "GIA" },
  { id: "h7",  asset_name: "Rathbone Ethical Bond Fund",          isin: "GB0001444814", asset_class: "FIXED_INCOME", units: 120_000, price: 2.84,    market_value: 340_800,  cost_basis: 320_000, unrealised_gain: 20_800,  pct_gain: 0.065, wrapper_type: "GIA" },
  { id: "h8",  asset_name: "Legal & General Global 100 Index",    isin: "GB00B0CNH708", asset_class: "EQUITY",       units: 210_000, price: 1.22,    market_value: 256_200,  cost_basis: 200_000, unrealised_gain: 56_200,  pct_gain: 0.281, wrapper_type: "OFFSHORE_BOND" },
];

export function useHoldings(clientId: string) {
  return useQuery<HoldingRow[]>({
    queryKey: ["holdings", clientId],
    queryFn: async () => DEMO_HOLDINGS,
    staleTime: 1000 * 60 * 5,
    placeholderData: DEMO_HOLDINGS,
  });
}
