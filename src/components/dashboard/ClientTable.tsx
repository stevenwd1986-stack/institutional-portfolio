import { useState, useMemo }  from "react";
import { useNavigate }         from "react-router-dom";
import { useClients }          from "../../hooks/useClients";
import { cn, fmt, fmtPct }     from "../../lib/utils";
import { ChevronUp, ChevronDown, Search, UserCheck } from "lucide-react";
import { Button }              from "../ui/button";
import { AssignAdviserModal }  from "../shared/AssignAdviserModal";

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

  const [sortKey,      setSortKey]      = useState<SortKey>("total_aum");
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");
  const [search,       setSearch]       = useState("");
  const [adviserFilter, setAdviserFilter] = useState("");
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [showModal,    setShowModal]    = useState(false);

  // Unique adviser list derived from loaded clients
  const adviserOptions = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => {
      if (c.adviser_id) map.set(c.adviser_id, c.adviser_name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const filtered = clients.filter((c) => {
    const nameMatch = `${c.first_name} ${c.last_name}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const adviserMatch = !adviserFilter || c.adviser_id === adviserFilter;
    return nameMatch && adviserMatch;
  });

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

  const allFilteredSelected =
    sorted.length > 0 && sorted.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  function handleSelectAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sorted.forEach((c) => (checked ? next.add(c.id) : next.delete(c.id)));
      return next;
    });
  }

  function handleToggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const cols: { label: string; key: SortKey | null; align?: "right" }[] = [
    { label: "Client",    key: "name" },
    { label: "Total AUM", key: "total_aum",     align: "right" },
    { label: "SIPP",      key: null,             align: "right" },
    { label: "ISA",       key: null,             align: "right" },
    { label: "GIA",       key: null,             align: "right" },
    { label: "Bond",      key: null,             align: "right" },
    { label: "1Y Return", key: "performance_1y", align: "right" },
    { label: "Updated",   key: "last_updated",   align: "right" },
  ];

  // Label for the bulk modal
  const bulkClientLabel = `${selectedIds.size} client${selectedIds.size > 1 ? "s" : ""}`;

  return (
    <>
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">

      {/* Header bar */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-[#0F172A]">Clients</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Adviser filter */}
          <select
            value={adviserFilter}
            onChange={(e) => { setAdviserFilter(e.target.value); clearSelection(); }}
            className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#002147] cursor-pointer"
          >
            <option value="">All advisers</option>
            {adviserOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Name search */}
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {/* Checkbox header */}
              <th className="pl-4 pr-2 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-[#002147] cursor-pointer focus:ring-[#002147]"
                  aria-label="Select all"
                />
              </th>
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
                className={cn(
                  "border-b border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors group",
                  selectedIds.has(c.id) && "bg-blue-50/60 hover:bg-blue-50"
                )}
              >
                <td className="pl-4 pr-2 py-3.5 w-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => handleToggleRow(c.id)}
                    className="rounded border-slate-300 text-[#002147] cursor-pointer focus:ring-[#002147]"
                    aria-label={`Select ${c.first_name} ${c.last_name}`}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div>
                    <span className="text-[#0F172A] font-medium text-sm group-hover:text-[#002147] transition-colors">
                      {c.first_name} {c.last_name}
                    </span>
                    <span className={cn("ml-2 text-xs font-medium", RISK_COLOR[c.risk_profile] ?? "text-slate-500")}>
                      {c.risk_profile.replace(/_/g, " ")}
                    </span>
                  </div>
                  {c.adviser_name && (
                    <div className="text-xs text-slate-400 mt-0.5">{c.adviser_name}</div>
                  )}
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

      {/* Footer — bulk action bar when clients selected, count otherwise */}
      {someSelected ? (
        <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F0F6FF] flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#002147]">
            {selectedIds.size} client{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
              <UserCheck className="w-3.5 h-3.5" />
              Reassign adviser
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-[#E2E8F0]">
          <span className="text-xs text-slate-500">{sorted.length} clients</span>
        </div>
      )}

    </div>

    {showModal && (
      <AssignAdviserModal
        clientIds={Array.from(selectedIds)}
        clientLabel={bulkClientLabel}
        onClose={() => setShowModal(false)}
        onSuccess={clearSelection}
      />
    )}
    </>
  );
}
