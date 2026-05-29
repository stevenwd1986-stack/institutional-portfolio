import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

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

const WRAPPER_TYPE_MAP: Record<string, string> = {
  isa_ss: "ISA", isa_cash: "ISA", lisa: "LISA", jisa: "JISA",
  sipp: "SIPP", sipp_drawdown: "SIPP", dc_workplace: "SIPP", db_workplace: "SIPP",
  gia: "GIA", investment_bond: "OFFSHORE_BOND",
};

export function useHoldings(clientId: string) {
  return useQuery<HoldingRow[]>({
    queryKey: ["holdings", clientId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];

      const { data, error } = await supabase
        .from("accounts")
        .select(`
          account_type,
          holdings(
            id, units, cost_basis, current_price, current_value,
            instruments(isin, name, asset_class)
          )
        `)
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (error) throw error;

      const rows: HoldingRow[] = [];
      for (const account of data as any[]) {
        const wrapperType = WRAPPER_TYPE_MAP[account.account_type] ?? "GIA";
        for (const h of account.holdings ?? []) {
          const gain = (h.current_value ?? 0) - (h.cost_basis ?? 0);
          rows.push({
            id:              h.id,
            asset_name:      h.instruments?.name ?? "Unknown",
            isin:            h.instruments?.isin ?? null,
            asset_class:     h.instruments?.asset_class ?? "EQUITY",
            units:           h.units ?? 0,
            price:           h.current_price ?? 0,
            market_value:    h.current_value ?? 0,
            cost_basis:      h.cost_basis ?? 0,
            unrealised_gain: gain,
            pct_gain:        (h.cost_basis ?? 0) > 0 ? gain / h.cost_basis : 0,
            wrapper_type:    wrapperType,
          });
        }
      }
      return rows;
    },
    staleTime: 1000 * 60 * 5,
  });
}
