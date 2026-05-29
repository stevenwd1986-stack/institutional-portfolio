import { useNavigate }  from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { cn, fmt, fmtDate }   from "../../lib/utils";
import { Button }              from "../ui/button";
import { Badge }               from "../ui/badge";

const RISK_BADGE: Record<string, string> = {
  VERY_LOW:    "bg-sky-50      text-sky-600    border-sky-200",
  LOW:         "bg-emerald-50  text-emerald-600 border-emerald-200",
  MEDIUM_LOW:  "bg-teal-50     text-teal-600   border-teal-200",
  MEDIUM:      "bg-amber-50    text-amber-600  border-amber-200",
  MEDIUM_HIGH: "bg-orange-50   text-orange-600 border-orange-200",
  HIGH:        "bg-rose-50     text-rose-600   border-rose-200",
  VERY_HIGH:   "bg-red-50      text-red-600    border-red-200",
};

interface ClientHeaderProps {
  client: {
    id:              string;
    firstName:       string;
    lastName:        string;
    adviserName:     string;
    riskProfile:     string;
    totalAUM:        number;
    lastReviewDate:  string | null;
  };
}

export function ClientHeader({ client }: ClientHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl px-6 py-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-[#002147] hover:bg-[#F1F5F9] transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm text-slate-500">{client.adviserName}</span>
              <Badge
                variant="outline"
                className={cn("border", RISK_BADGE[client.riskProfile] ?? RISK_BADGE.MEDIUM)}
              >
                {client.riskProfile.replace(/_/g, " ")}
              </Badge>
              {client.lastReviewDate && (
                <span className="text-xs text-slate-400">
                  Last review: {fmtDate(client.lastReviewDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:flex-col sm:items-end shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-0.5">Total AUM</div>
            <div className="text-2xl font-semibold text-[#0F172A] tracking-tight">
              {fmt(client.totalAUM)}
            </div>
          </div>
          <Button size="sm" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Run Report
          </Button>
        </div>
      </div>
    </div>
  );
}
