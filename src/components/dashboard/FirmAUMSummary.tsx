import { useFirmAUM }      from "../../hooks/useFirmAUM";
import { StatCard }         from "../shared/StatCard";
import { fmt, fmtPct, fmtCompact } from "../../lib/utils";
import { TrendingUp, Users, Bell, BarChart3 } from "lucide-react";

export function FirmAUMSummary() {
  const { data } = useFirmAUM();

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Total Firm AUM"
        value={fmtCompact(data?.total_aum ?? 0)}
        subtext={fmt(data?.total_aum ?? 0)}
        icon={<BarChart3 className="w-4 h-4" />}
      />
      <StatCard
        label="Active Clients"
        value={String(data?.active_clients ?? 0)}
        icon={<Users className="w-4 h-4" />}
      />
      <StatCard
        label="Avg 1Y Performance"
        value={fmtPct(data?.avg_1y_performance ?? 0)}
        valueClass={(data?.avg_1y_performance ?? 0) >= 0 ? "text-emerald-600" : "text-rose-500"}
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <StatCard
        label="Pending Alerts"
        value={String(data?.pending_alerts ?? 0)}
        valueClass={(data?.pending_alerts ?? 0) > 0 ? "text-amber-600" : "text-slate-500"}
        icon={<Bell className="w-4 h-4" />}
      />
    </div>
  );
}
