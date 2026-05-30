import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface SubAccountSummary {
  id:       string;
  name:     string;
  type:     "DIRECT_HOLDINGS" | "DISCRETIONARY_MANDATE" | "SUB_GIA";
  manager?: string;
  value:    number;
}

export interface WrapperSummary {
  id:                  string;
  wrapper_type:        "SIPP" | "ISA" | "GIA" | "OFFSHORE_BOND" | "LISA" | "JISA";
  platform:            string;
  value:               number;
  cost_basis:          number;
  performance_1y:      number;
  contributions_total: number;
  is_closed:           boolean;
  closed_date?:        string;
  transferred_to?:     string;
  transfer_note?:      string;
  sub_accounts:        SubAccountSummary[];
}

const WRAPPER_TYPE_MAP: Record<string, WrapperSummary["wrapper_type"]> = {
  isa_ss:          "ISA",
  isa_cash:        "ISA",
  lisa:            "LISA",
  jisa:            "JISA",
  sipp:            "SIPP",
  sipp_drawdown:   "SIPP",
  dc_workplace:    "SIPP",
  db_workplace:    "SIPP",
  gia:             "GIA",
  investment_bond: "OFFSHORE_BOND",
};

export function useWrappers(clientId: string) {
  return useQuery<WrapperSummary[]>({
    queryKey: ["wrappers", clientId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];

      const { data, error } = await supabase
        .from("accounts")
        .select(`
          id, account_type, provider, current_value, is_active, closed_at, annual_contribution,
          holdings(cost_basis)
        `)
        .eq("client_id", clientId)
        .order("is_active", { ascending: false });

      if (error) throw error;

      return (data as any[]).map((a) => {
        const costBasis = (a.holdings as any[])
          .reduce((s: number, h: any) => s + (h.cost_basis ?? 0), 0);

        return {
          id:                  a.id,
          wrapper_type:        WRAPPER_TYPE_MAP[a.account_type] ?? "GIA",
          platform:            a.provider ?? "Unknown",
          value:               a.current_value ?? 0,
          cost_basis:          costBasis,
          performance_1y:      0,
          contributions_total: a.annual_contribution ?? 0,
          is_closed:           !a.is_active,
          closed_date:         a.closed_at ?? undefined,
          sub_accounts:        [],
        } satisfies WrapperSummary;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}
