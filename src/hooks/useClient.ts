import { useQuery } from "@tanstack/react-query";
import { DEMO_CLIENTS } from "./useClients";

export interface ClientDetail {
  id:              string;
  firstName:       string;
  lastName:        string;
  adviserName:     string;
  riskProfile:     string;
  totalAUM:        number;
  lastReviewDate:  string | null;
}

export function useClient(clientId: string) {
  return useQuery<ClientDetail>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const row = DEMO_CLIENTS.find((c) => c.id === clientId);
      if (!row) throw new Error("Client not found");
      return {
        id:             row.id,
        firstName:      row.first_name,
        lastName:       row.last_name,
        adviserName:    "Sarah Mitchell",
        riskProfile:    row.risk_profile,
        totalAUM:       row.total_aum,
        lastReviewDate: row.last_updated,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
