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

const RISK_MAP: Record<string, string> = {
  cautious:               "LOW",
  moderately_cautious:    "MEDIUM_LOW",
  balanced:               "MEDIUM",
  moderately_adventurous: "MEDIUM_HIGH",
  adventurous:            "HIGH",
};

export function useClient(clientId: string) {
  return useQuery<ClientDetail>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!isSupabaseConfigured) throw new Error("Supabase not configured");

      const { data, error } = await supabase
        .from("clients")
        .select(`
          id, first_name, last_name, risk_band, last_review_date,
          advisers(first_name, last_name),
          accounts(current_value, is_active)
        `)
        .eq("id", clientId)
        .single();

      if (error) throw error;

      const adviser = data.advisers as any;
      const adviserName = adviser
        ? `${adviser.first_name} ${adviser.last_name}`
        : "Adviser";

      const totalAUM = (data.accounts as any[])
        .filter((a: any) => a.is_active)
        .reduce((s: number, a: any) => s + (a.current_value ?? 0), 0);

      return {
        id:             data.id,
        firstName:      data.first_name,
        lastName:       data.last_name,
        adviserName,
        riskProfile:    RISK_MAP[data.risk_band ?? ""] ?? "MEDIUM",
        totalAUM,
        lastReviewDate: data.last_review_date,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
