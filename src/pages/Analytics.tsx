import { TrendingUp } from "lucide-react";
import { PageShell }  from "../components/shared/PageShell";

export default function Analytics() {
  return (
    <PageShell title="Analytics">
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#E8F0FE] flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-[#002147]" />
        </div>
        <p className="text-sm font-medium text-[#0F172A]">Analytics</p>
        <p className="text-xs text-slate-400">This section is coming soon.</p>
      </div>
    </PageShell>
  );
}
