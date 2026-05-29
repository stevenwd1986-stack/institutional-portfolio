import { useQuery } from "@tanstack/react-query";

export interface AlertItem {
  id:       string;
  category: "PERFORMANCE_ANOMALY" | "DATA_GAP" | "PENDING_TRANSFER" | "COMPLIANCE_FLAG" | "RECONCILIATION_ERROR";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title:    string;
  message:  string;
  clientName?: string;
  created_at: string;
}

const DEMO_ALERTS: AlertItem[] = [
  { id: "a1", category: "PENDING_TRANSFER",    severity: "WARNING",  title: "Platform transfer pending", message: "Transfer of £245,000 from Transact to Quilter — awaiting settlement.", clientName: "James Thornton",   created_at: "2026-05-27T14:22:00Z" },
  { id: "a2", category: "DATA_GAP",            severity: "WARNING",  title: "Missing price data",        message: "Asset GB00BYQ0JC66 has no price for 3 consecutive days.",              clientName: "Robert Ashworth",   created_at: "2026-05-26T09:15:00Z" },
  { id: "a3", category: "PERFORMANCE_ANOMALY", severity: "CRITICAL", title: "TWR anomaly detected",      message: "Portfolio TWR for H. Carmichael SIPP shows -21% — verify data.",      clientName: "Helen Carmichael",  created_at: "2026-05-25T16:40:00Z" },
];

export function useAlerts() {
  return useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: async () => DEMO_ALERTS,
    staleTime: 1000 * 60 * 2,
    placeholderData: DEMO_ALERTS,
  });
}
