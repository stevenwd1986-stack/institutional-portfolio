import { useState }   from "react";
import { useClients } from "../../hooks/useClients";
import { cn }          from "../../lib/utils";
import { FileText, CheckSquare, Square, Download } from "lucide-react";
import { Button }      from "../ui/button";

export function BatchReportRunner() {
  const { data: clients = [] } = useClients();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selected.size === clients.length ? new Set() : new Set(clients.map((c) => c.id)));
  }

  async function runReports() {
    if (selected.size === 0) return;
    setRunning(true);
    await new Promise((r) => setTimeout(r, 1800));
    setRunning(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  const allSelected = selected.size === clients.length && clients.length > 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-[#0F172A]">Batch Reports</h2>
        </div>
        <Button
          size="sm"
          onClick={runReports}
          disabled={selected.size === 0 || running}
          className={cn(done && "bg-emerald-600 hover:bg-emerald-700")}
        >
          {done ? (
            <><Download className="w-3.5 h-3.5 mr-1.5" />Ready ({selected.size})</>
          ) : running ? (
            <>Generating…</>
          ) : (
            <>Generate {selected.size > 0 ? `(${selected.size})` : ""} Reports</>
          )}
        </Button>
      </div>

      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="w-10 px-4 py-2.5">
                <button onClick={toggleAll} className="text-slate-400 hover:text-[#002147]">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-[#002147]" />
                    : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Client</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">AUM</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr
                key={c.id}
                onClick={() => toggle(c.id)}
                className={cn(
                  "border-b border-[#E2E8F0] cursor-pointer transition-colors",
                  selected.has(c.id) ? "bg-[#E8F0FE]" : "hover:bg-[#F8FAFC]"
                )}
              >
                <td className="px-4 py-2.5 text-center">
                  {selected.has(c.id)
                    ? <CheckSquare className="w-4 h-4 text-[#002147] inline" />
                    : <Square      className="w-4 h-4 text-slate-300 inline" />}
                </td>
                <td className="px-4 py-2.5 text-sm text-[#0F172A]">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-2.5 text-right text-xs text-slate-500 tabular-nums">
                  {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", notation: "compact", maximumFractionDigits: 1 }).format(c.total_aum)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
