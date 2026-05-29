import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface FirmAUMData {
  total_aum:          number;
  active_clients:     number;
  avg_1y_performance: number;
  pending_alerts:     number;
}

export function useFirmAUM() {
  return useQuery<FirmAUMData>({
    queryKey: ["firm-aum"],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return { total_aum: 0, active_clients: 0, avg_1y_performance: 0, pending_alerts: 0 };
      }

      const [clientsRes, alertsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, accounts(current_value, is_active)")
          .eq("is_active", true),
        supabase
          .from("drift_alerts")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
      ]);

      if (clientsRes.error) throw clientsRes.error;

      let total_aum = 0;
      for (const client of clientsRes.data as any[]) {
        for (const account of client.accounts ?? []) {
          if (account.is_active) total_aum += account.current_value ?? 0;
        }
      }

      return {
        total_aum,
        active_clients:     clientsRes.data.length,
        avg_1y_performance: 0,
        pending_alerts:     alertsRes.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 15,
  });
}
