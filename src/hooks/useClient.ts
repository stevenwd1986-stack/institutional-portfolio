import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface ClientDetail {
  id:             string;
  firstName:      string;
  lastName:       string;
  adviserName:    string;
  riskProfile:    string;
  totalAUM:       number;
  lastReviewDate: string | null;
}

// Split a portfolio/household name like "stevenwood's Portfolio" into first/last
function splitName(name: string): { firstName: string; lastName: string } {
  // Strip possessive suffix and "Portfolio"/"Household"
  const cleaned = name
    .replace(/'s\s+(Portfolio|Household)$/i, "")
    .trim();
  const parts = cleaned.split(/\s+/);
  return {
    firstName: parts[0] ?? cleaned,
    lastName:  parts.slice(1).join(" ") || "",
  };
}

export function useClient(clientId: string) {
  return useQuery<ClientDetail>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!isSupabaseConfigured) throw new Error("Supabase not configured");

      // clientId = portfolio.id
      const { data, error } = await supabase
        .from("portfolios")
        .select("id, name, updated_at")
        .eq("id", clientId)
        .single();

      if (error) throw error;

      const { firstName, lastName } = splitName(data.name as string);

      return {
        id:             data.id,
        firstName,
        lastName,
        adviserName:    "Adviser",
        riskProfile:    "MEDIUM",
        totalAUM:       0,
        lastReviewDate: null,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
