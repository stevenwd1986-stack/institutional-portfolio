import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface FirmAUMData {
  total_aum:          number;
  active_clients:     number;
  avg_1y_performance: number;
  pending_alerts:     number;
}

// Demo data — replace with live Supabase query once connected
const DEMO: FirmAUMData = {
  total_aum:          47_320_850,
  active_clients:     34,
  avg_1y_performance: 0.0812,
  pending_alerts:     3,
};

export function useFirmAUM() {
  return useQuery<FirmAUMData>({
    queryKey: ["firm-aum"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEMO;

      // TODO: call get_firm_aum() RPC once project is connected
      return DEMO;
    },
    staleTime: 1000 * 60 * 15,
    placeholderData: DEMO,
  });
}
