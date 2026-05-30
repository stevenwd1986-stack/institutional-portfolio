import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface ClientRow {
  id:             string;
  first_name:     string;
  last_name:      string;
  risk_profile:   string;
  total_aum:      number;
  sipp_value:     number;
  isa_value:      number;
  gia_value:      number;
  bond_value:     number;
  performance_1y: number;
  last_updated:   string;
}

// account_type → wrapper bucket for AUM breakdown
const SIPP_TYPES  = new Set(["sipp", "sipp_drawdown", "workplace_pension"]);
const ISA_TYPES   = new Set(["isa", "lisa", "jisa"]);
const BOND_TYPES  = new Set(["offshore_bond"]);

// Split a portfolio name like "stevenwood's Portfolio" → "stevenwood", ""
function splitName(name: string): { firstName: string; lastName: string } {
  const cleaned = name.replace(/'s\s+(Portfolio|Household)$/i, "").trim();
  const parts   = cleaned.split(/\s+/);
  return {
    firstName: parts[0] ?? cleaned,
    lastName:  parts.slice(1).join(" ") || "",
  };
}

export function useClients() {
  return useQuery<ClientRow[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];

      // Each portfolio is one "client" in the institutional view.
      // accounts table links to portfolios via portfolio_id.
      const { data, error } = await supabase
        .from("portfolios")
        .select(`
          id, name, updated_at,
          accounts(account_type, status)
        `)
        .order("name");

      if (error) throw error;

      return (data as any[]).map((p) => {
        const { firstName, lastName } = splitName(p.name as string);
        const active: any[] = (p.accounts ?? []).filter((a: any) => a.status === "active");

        const sum = (pred: (a: any) => boolean) =>
          active.filter(pred).length; // count only — no current_value in schema

        return {
          id:             p.id,
          first_name:     firstName,
          last_name:      lastName,
          risk_profile:   "MEDIUM",
          total_aum:      0,
          sipp_value:     sum((a) => SIPP_TYPES.has(a.account_type)),
          isa_value:      sum((a) => ISA_TYPES.has(a.account_type)),
          gia_value:      sum((a) => a.account_type === "gia"),
          bond_value:     sum((a) => BOND_TYPES.has(a.account_type)),
          performance_1y: 0,
          last_updated:   (p.updated_at as string).slice(0, 10),
        } satisfies ClientRow;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}
