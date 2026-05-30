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

// account_type enum values from Supabase → display wrapper type
const WRAPPER_TYPE_MAP: Record<string, WrapperSummary["wrapper_type"]> = {
  isa:              "ISA",
  lisa:             "LISA",
  jisa:             "JISA",
  sipp:             "SIPP",
  sipp_drawdown:    "SIPP",
  workplace_pension:"SIPP",
  offshore_bond:    "OFFSHORE_BOND",
  gia:              "GIA",
  other:            "GIA",
};

export function useWrappers(clientId: string) {
  return useQuery<WrapperSummary[]>({
    queryKey: ["wrappers", clientId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];

      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_type, provider_name, status")
        .eq("portfolio_id", clientId)
        .order("created_at");

      if (error) throw error;

      return (data as any[]).map((a) => ({
        id:                  a.id,
        wrapper_type:        WRAPPER_TYPE_MAP[a.account_type] ?? "GIA",
        platform:            a.provider_name ?? "Unknown",
        value:               0,
        cost_basis:          0,
        performance_1y:      0,
        contributions_total: 0,
        is_closed:           a.status !== "active",
        sub_accounts:        [],
      } satisfies WrapperSummary));
    },
    staleTime: 1000 * 60 * 5,
  });
}
