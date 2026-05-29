import { useAlerts } from "../../hooks/useAlerts";
import { cn }         from "../../lib/utils";
import { AlertTriangle, Info, XCircle, Clock } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  PERFORMANCE_ANOMALY: "Performance",
  DATA_GAP:            "Data Gap",
  PENDING_TRANSFER:    "Transfer",
  COMPLIANCE_FLAG:     "Compliance",
  RECONCILIATION_ERROR:"Reconciliation",
};

const SEVERITY_ICON = {
  CRITICAL: <XCircle    className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
  WARNING:  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
  INFO:     <Info        className="w-3.5 h-3.5 text-sky-500 shrink-0" />,
};

const SEVERITY_BORDER: Record<string, string> = {
  CRITICAL: "border-l-rose-400",
  WARNING:  "border-l-amber-400",
  INFO:     "border-l-sky-400",
};

export function AlertsPanel() {
  const { data: alerts = [] } = useAlerts();

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col h-fit shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F172A]">Alerts</h2>
        {alerts.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold border border-amber-200">
            {alerts.length}
          </span>
        )}
      </div>

      <div className="divide-y divide-[#E2E8F0]">
        {alerts.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No active alerts
          </div>
        )}
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "px-5 py-4 border-l-2 hover:bg-[#F8FAFC] transition-colors cursor-pointer",
              SEVERITY_BORDER[alert.severity] ?? "border-l-[#E2E8F0]"
            )}
          >
            <div className="flex items-start gap-2">
              {SEVERITY_ICON[alert.severity]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-[#0F172A] truncate">{alert.title}</span>
                  <span className="text-xs text-slate-500 shrink-0 font-medium bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                    {CATEGORY_LABEL[alert.category] ?? alert.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {alert.clientName && (
                    <span className="text-xs text-slate-500">{alert.clientName}</span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
