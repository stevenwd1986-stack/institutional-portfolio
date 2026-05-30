import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface ClientRow {
  id:             string;
  first_name:     string;
  last_name:      string;
  adviser_id:     string;
  adviser_name:   string;
  risk_profile:   string;
  total_aum:      number;
  sipp_value:     number;
  isa_value:      number;
  gia_value:      number;
  bond_value:     number;
  performance_1y: number;
  last_updated:   string;
}

// Maps advise-platform risk_band enum → display keys
const RISK_MAP: Record<string, string> = {
  cautious:               "LOW",
  moderately_cautious:    "MEDIUM_LOW",
  balanced:               "MEDIUM",
  moderately_adventurous: "MEDIUM_HIGH",
  adventurous:            "HIGH",
};

const SIPP_TYPES = new Set(["sipp", "sipp_drawdown", "dc_workplace", "db_workplace"]);
const ISA_TYPES  = new Set(["isa_ss", "isa_cash", "lisa", "jisa"]);

type AccountRow = { account_type: string; current_value: number; is_active: boolean };

function aggregateAccounts(accounts: AccountRow[]) {
  const active = accounts.filter((a) => a.is_active);
  const sum = (pred: (a: AccountRow) => boolean) =>
    active.filter(pred).reduce((s, a) => s + (a.current_value ?? 0), 0);
  return {
    total_aum:  sum(() => true),
    sipp_value: sum((a) => SIPP_TYPES.has(a.account_type)),
    isa_value:  sum((a) => ISA_TYPES.has(a.account_type)),
    gia_value:  sum((a) => a.account_type === "gia"),
    bond_value: sum((a) => a.account_type === "investment_bond"),
  };
}

export function useClients() {
  return useQuery<ClientRow[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];

      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, adviser_id, risk_band, updated_at, advisers(first_name, last_name), accounts(account_type, current_value, is_active)")
        .eq("is_active", true)
        .order("last_name");

      if (error) throw error;

      return (data as any[]).map((c): ClientRow => {
        const adv = c.advisers as { first_name: string; last_name: string } | null;
        return {
          id:             c.id,
          first_name:     c.first_name,
          last_name:      c.last_name,
          adviser_id:     c.adviser_id ?? "",
          adviser_name:   adv ? `${adv.first_name} ${adv.last_name}` : "",
          risk_profile:   RISK_MAP[c.risk_band ?? ""] ?? "MEDIUM",
          performance_1y: 0,
          last_updated:   (c.updated_at as string).slice(0, 10),
          ...aggregateAccounts(c.accounts ?? []),
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}
