import { useState }    from "react";
import { useNavigate } from "react-router-dom";
import { useClients }  from "../../hooks/useClients";
import { cn, fmt, fmtPct } from "../../lib/utils";
import { ChevronUp, ChevronDown, Search } from "lucide-react";

type SortKey = "name" | "total_aum" | "performance_1y" | "last_updated";

const RISK_COLOR: Record<string, string> = {
  VERY_LOW:    "text-sky-500",
  LOW:         "text-emerald-600",
  MEDIUM_LOW:  "text-teal-600",
  MEDIUM:      "text-amber-500",
  MEDIUM_HIGH: "text-orange-500",
  HIGH:        "text-rose-500",
  VERY_HIGH:   "text-red-600",
};

export function ClientTable() {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const [sortKey, setSortKey] = useState<SortKey>("total_aum");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search,  setSearch]  = useState("");

  const filtered = clients.filter((c) =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const m = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name")
      return m * `${a.first_name}${a.last_name}`.localeCompare(`${b.first_name}${b.last_name}`);
    if (sortKey === "last_updated")
      return m * a.last_updated.localeCompare(b.last_updated);
    return m * ((a as unknown as Record<string, number>)[sortKey] - (b as unknown as Record<string, number>)[sortKey]);
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 inline ml-0.5 -mt-0.5" />
      : <ChevronUp   className="w-3 h-3 inline ml-0.5 -mt-0.5" />;
  }

  const cols: { label: string; key: SortKey | null; align?: "right" }[] = [
    { label: "Client",        key: "name" },
    { label: "Total AUM",     key: "total_aum",     align: "right" },
    { label: "SIPP",          key: null,             align: "right" },
    { label: "ISA",           key: null,             align: "right" },
    { label: "GIA",           key: null,             align: "right" },
    { label: "Bond",          key: null,             align: "right" },
    { label: "1Y Return",     key: "performance_1y", align: "right" },
    { label: "Updated",       key: "last_updated",   align: "right" },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-[#0F172A]">Clients</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg pl-8 pr-3 py-1.5 w-48 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002147]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {cols.map(({ label, key, align }) => (
                <th
                  key={label}
                  onClick={() => key && handleSort(key)}
                  className={cn(
                    "px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap",
                    key && "cursor-pointer select-none hover:text-[#0F172A]",
                    align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {label}{key && <SortIcon col={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/clients/${c.id}`)}
                className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3.5">
                  <span className="text-[#0F172A] font-medium text-sm group-hover:text-[#002147] transition-colors">
                    {c.first_name} {c.last_name}
                  </span>
                  <span className={cn("ml-2 text-xs font-medium", RISK_COLOR[c.risk_profile] ?? "text-slate-500")}>
                    {c.risk_profile.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-[#0F172A] font-semibold tabular-nums">{fmt(c.total_aum)}</td>
                <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums text-xs">{c.sipp_value  > 0 ? fmt(c.sipp_value)  : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums text-xs">{c.isa_value   > 0 ? fmt(c.isa_value)   : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums text-xs">{c.gia_value   > 0 ? fmt(c.gia_value)   : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums text-xs">{c.bond_value  > 0 ? fmt(c.bond_value)  : <span className="text-slate-300">—</span>}</td>
                <td className={cn(
                  "px-4 py-3.5 text-right tabular-nums font-semibold text-sm",
                  c.performance_1y >= 0 ? "text-emerald-600" : "text-rose-500"
                )}>
                  {fmtPct(c.performance_1y)}
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-400 whitespace-nowrap">
                  {new Date(c.last_updated).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-[#E2E8F0]">
        <span className="text-xs text-slate-500">{sorted.length} clients</span>
      </div>
    </div>
  );
}
