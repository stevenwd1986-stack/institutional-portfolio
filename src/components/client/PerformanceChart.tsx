import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { usePerformance }  from "../../hooks/usePerformance";
import { useBenchmarks }   from "../../hooks/useBenchmarks";
import { cn }              from "../../lib/utils";
import { fmtPct }          from "../../lib/utils";

type Period = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
type Scale  = "linear" | "log";

const WRAPPER_COLORS: Record<string, string> = {
  SIPP:          "#002147",  // oxford navy
  ISA:           "#059669",  // emerald
  GIA:           "#64748B",  // slate
  OFFSHORE_BOND: "#7C3AED",  // violet
  LISA:          "#DB2777",
  JISA:          "#2563EB",
};

const BENCHMARK_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "SP500",   label: "S&P 500",    color: "#F59E0B" },
  { key: "FTSE100", label: "FTSE 100",   color: "#EF4444" },
  { key: "MSCI",    label: "MSCI World", color: "#3B82F6" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-lg min-w-[160px]">
      <p className="text-xs text-slate-500 mb-2">
        {new Date(label).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs mb-1">
          <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
          <span className="text-[#0F172A] tabular-nums font-semibold">{Number(entry.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export function PerformanceChart({ clientId }: { clientId: string }) {
  const [period,     setPeriod]     = useState<Period>("1Y");
  const [scale,      setScale]      = useState<Scale>("linear");
  const [activeBenchmarks, setActiveBenchmarks] = useState<Record<string, boolean>>({
    SP500: true, FTSE100: false, MSCI: false,
  });

  const activeKeys = Object.entries(activeBenchmarks).filter(([, v]) => v).map(([k]) => k);

  const { data: perfData }  = usePerformance(clientId, period);
  const { data: benchData } = useBenchmarks(activeKeys, period);

  const chartData = useMemo(() => {
    if (!perfData?.series?.length) return [];

    const dateMap = new Map<string, Record<string, number | string>>();

    perfData.series.forEach(({ wrapper_type, points }) =>
      points.forEach(({ date, value }) => {
        if (!dateMap.has(date)) dateMap.set(date, { date });
        dateMap.get(date)![wrapper_type] = value;
      })
    );

    benchData?.forEach(({ key, points }) =>
      points.forEach(({ date, value }) => {
        if (!dateMap.has(date)) dateMap.set(date, { date });
        dateMap.get(date)![key] = value;
      })
    );

    return [...dateMap.values()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [perfData, benchData]);

  const wrapperTypes = perfData?.series?.map((s) => s.wrapper_type) ?? [];
  const { twr, xirr, cagr } = perfData?.metrics ?? {};

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
      {/* Header + Controls */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">Portfolio Performance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Base 100 indexed</p>
          </div>

          {/* Performance metrics summary */}
          <div className="flex items-center gap-4">
            {[
              { label: "TWR",  value: twr  },
              { label: "XIRR", value: xirr },
              { label: "CAGR", value: cagr },
            ].map(({ label, value }) => (
              <div key={label} className="text-right">
                <p className="text-xs text-slate-500">{label}</p>
                <p className={cn(
                  "text-sm font-semibold tabular-nums",
                  value == null ? "text-slate-400" :
                  value >= 0 ? "text-emerald-600" : "text-rose-500"
                )}>
                  {value != null ? fmtPct(value) : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period tabs */}
          <div className="flex items-center gap-0.5 bg-[#F1F5F9] rounded-lg p-1">
            {(["1M","3M","6M","1Y","3Y","5Y","ALL"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  period === p
                    ? "bg-[#002147] text-white shadow-sm"
                    : "text-slate-500 hover:text-[#0F172A]"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Scale toggle */}
          <div className="flex items-center gap-0.5 bg-[#F1F5F9] rounded-lg p-1">
            {(["linear","log"] as Scale[]).map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                  scale === s ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-[#0F172A]"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Benchmark toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {BENCHMARK_CONFIG.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setActiveBenchmarks((b) => ({ ...b, [key]: !b[key] }))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                  activeBenchmarks[key]
                    ? "border-transparent text-white"
                    : "border-[#E2E8F0] text-slate-500 hover:text-[#0F172A]"
                )}
                style={activeBenchmarks[key] ? { backgroundColor: color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeBenchmarks[key] ? "rgba(255,255,255,0.8)" : color }}
                />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            tickFormatter={(d) =>
              new Date(d).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
            }
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            scale={scale === "log" ? "log" : "linear"}
            domain={scale === "log" ? (["auto", "auto"] as [string, string]) : undefined}
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#64748B" }}
            formatter={(name) =>
              name === "SIPP" ? "SIPP" :
              name === "ISA"  ? "ISA"  :
              name === "GIA"  ? "GIA"  :
              name === "OFFSHORE_BOND" ? "Offshore Bond" :
              BENCHMARK_CONFIG.find((b) => b.key === name)?.label ?? name
            }
          />

          {/* Wrapper performance lines */}
          {wrapperTypes.map((wt) => (
            <Line
              key={wt}
              type="monotone"
              dataKey={wt}
              stroke={WRAPPER_COLORS[wt] ?? "#94A3B8"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          ))}

          {/* Benchmark lines (dashed) */}
          {BENCHMARK_CONFIG.filter(({ key }) => activeBenchmarks[key]).map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
