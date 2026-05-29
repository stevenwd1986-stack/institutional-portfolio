import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  valueClass?: string;
  subtext?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, valueClass, subtext, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[#64748B]">{label}</p>
        {icon && <span className="text-[#94A3B8]">{icon}</span>}
      </div>
      <p className={cn(
        "mt-2 text-2xl font-semibold tracking-tight",
        valueClass ?? "text-[#0F172A]"
      )}>
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-[#64748B]">{subtext}</p>}
    </div>
  );
}
