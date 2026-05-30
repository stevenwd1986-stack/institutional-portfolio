import { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, PoundSterling, AlertCircle, Loader2 } from "lucide-react";
import { PageShell }           from "../components/shared/PageShell";
import { StatCard }            from "../components/shared/StatCard";
import { useClients }          from "../hooks/useClients";
import { useFirmAUM }          from "../hooks/useFirmAUM";
import { useFirmAssetClasses } from "../hooks/useFirmAnalytics";
import { fmt, fmtCompact }     from "../lib/utils";

// ── Config ────────────────────────────────────────────────────────────────────

const WRAPPER_COLOR = {
  SIPP: "#002147",
  ISA:  "#059669",
  GIA:  "#64748B",
  BOND: "#7C3AED",
} as const;

const WRAPPER_LABEL = {
  SIPP: "SIPP / Pension",
  ISA:  "ISA / LISA / JISA",
  GIA:  "General Account",
  BOND: "Offshore Bond",
} as const;

const RISK_ORDER = ["LOW", "MEDIUM_LOW", "MEDIUM", "MEDIUM_HIGH", "HIGH"] as const;

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  LOW:         { label: "Cautious",          color: "#10B981" },
  MEDIUM_LOW:  { label: "Mod. Cautious",     color: "#6EE7B7" },
  MEDIUM:      { label: "Balanced",          color: "#F59E0B" },
  MEDIUM_HIGH: { label: "Mod. Adventurous",  color: "#F97316" },
  HIGH:        { label: "Adventurous",       color: "#EF4444" },
};

// ── Tooltips ──────────────────────────────────────────────────────────────────

function PieTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const d   = payload[0];
  const pct = total > 0 ? (d.value / total) * 100 : 0;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 shadow-lg min-w-[140px]">
      <p className="text-xs font-semibold text-[#0F172A]">{d.name}</p>
      <p className="text-xs text-slate-600 mt-0.5 tabular-nums">{fmt(d.value)}</p>
      <p className="text-xs text-slate-400">{pct.toFixed(1)}%</p>
    </div>
  );
}

function StackedTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 shadow-lg min-w-[180px]">
      <p className="text-xs font-semibold text-[#0F172A] mb-2">{label}</p>
      {payload
        .filter((p: any) => (p.value ?? 0) > 0)
        .map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-3 py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.fill }} />
              {p.name}
            </span>
            <span className="text-xs font-medium tabular-nums">{fmtCompact(p.value)}</span>
          </div>
        ))}
      <div className="border-t border-[#E2E8F0] mt-2 pt-2 flex justify-between">
        <span className="text-xs font-semibold text-slate-500">Total</span>
        <span className="text-xs font-bold text-[#0F172A] tabular-nums">{fmtCompact(total)}</span>
      </div>
    </div>
  );
}

// ── DonutChart ────────────────────────────────────────────────────────────────

interface DonutSlice { name: string; value: number; color: string }

function DonutChart({
  data, total, centerLabel, loading,
}: {
  data: DonutSlice[]; total: number; centerLabel: string; loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 200 }}>
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }
  return (
    <div className="relative" style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={(props) => <PieTooltip {...props} total={total} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-xl font-bold text-[#0F172A] tabular-nums leading-tight">
            {fmtCompact(total)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{centerLabel}</p>
        </div>
      </div>
    </div>
  );
}

function SliceLegend({ data, total }: { data: DonutSlice[]; total: number }) {
  return (
    <div className="space-y-2 mt-4">
      {data.map((entry) => {
        const pct = total > 0 ? (entry.value / total) * 100 : 0;
        return (
          <div key={entry.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: entry.color }}
              />
              <span className="text-xs text-slate-600 truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-[#0F172A] tabular-nums">
                {fmtCompact(entry.value)}
              </span>
              <span className="text-xs text-slate-400 tabular-nums w-10 text-right">
                {pct.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ChartCard ─────────────────────────────────────────────────────────────────

function ChartCard({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── HBar: custom HTML horizontal bar ─────────────────────────────────────────

function HBar({
  label, value, maxValue, color, note,
}: {
  label: string; value: number; maxValue: number; color: string; note?: string;
}) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 1) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="text-xs text-slate-500 truncate shrink-0"
        style={{ width: 110 }}
      >
        {label}
      </span>
      <div className="flex-1 bg-[#F1F5F9] rounded-full overflow-hidden" style={{ height: 8 }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="shrink-0 text-right" style={{ width: 100 }}>
        <span className="text-xs font-semibold text-[#0F172A] tabular-nums">
          {fmtCompact(value)}
        </span>
        {note && <span className="text-xs text-slate-400 ml-1.5">{note}</span>}
      </div>
    </div>
  );
}

// ── Empty / Loading shells ────────────────────────────────────────────────────

function ChartLoader() {
  return (
    <div className="flex items-center justify-center" style={{ height: 200 }}>
      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
    </div>
  );
}

function ChartEmpty({ message = "No data available" }: { message?: string }) {
  return (
    <p className="text-xs text-slate-400 text-center py-16">{message}</p>
  );
}

// ── Analytics page ────────────────────────────────────────────────────────────

export default function Analytics() {
  const { data: clients = [],    isLoading: clientsLoading } = useClients();
  const { data: firmAUM }                                    = useFirmAUM();
  const { data: assetClasses = [], isLoading: assetsLoading } = useFirmAssetClasses();

  // Wrapper allocation donut
  const wrapperSlices = useMemo<DonutSlice[]>(() => {
    const t = { SIPP: 0, ISA: 0, GIA: 0, BOND: 0 };
    clients.forEach((c) => {
      t.SIPP += c.sipp_value;
      t.ISA  += c.isa_value;
      t.GIA  += c.gia_value;
      t.BOND += c.bond_value;
    });
    return (Object.keys(t) as (keyof typeof t)[])
      .filter((k) => t[k] > 0)
      .map((k) => ({ name: WRAPPER_LABEL[k], value: t[k], color: WRAPPER_COLOR[k] }));
  }, [clients]);

  const totalWrapperAUM = wrapperSlices.reduce((s, d) => s + d.value, 0);

  // Risk profile distribution
  const riskBuckets = useMemo(() => {
    const map: Record<string, { count: number; aum: number }> = {};
    clients.forEach((c) => {
      if (!map[c.risk_profile]) map[c.risk_profile] = { count: 0, aum: 0 };
      map[c.risk_profile].count++;
      map[c.risk_profile].aum += c.total_aum;
    });
    return RISK_ORDER
      .filter((k) => map[k])
      .map((k) => ({ key: k, ...RISK_CONFIG[k], ...map[k] }));
  }, [clients]);

  const maxRiskAUM = Math.max(...riskBuckets.map((d) => d.aum), 1);

  // Top clients leaderboard (stacked bar)
  const topClients = useMemo(
    () =>
      [...clients]
        .sort((a, b) => b.total_aum - a.total_aum)
        .slice(0, 8)
        .map((c) => ({
          name: `${c.first_name[0]}. ${c.last_name}`,
          SIPP: c.sipp_value,
          ISA:  c.isa_value,
          GIA:  c.gia_value,
          Bond: c.bond_value,
        })),
    [clients],
  );

  const maxClientAUM = Math.max(
    ...topClients.map((c) => c.SIPP + c.ISA + c.GIA + c.Bond),
    1,
  );

  // AUM by adviser
  const adviserBuckets = useMemo(() => {
    const map: Record<string, { name: string; aum: number; count: number }> = {};
    clients.forEach((c) => {
      const key = c.adviser_id || "unassigned";
      if (!map[key]) map[key] = { name: c.adviser_name || "Unassigned", aum: 0, count: 0 };
      map[key].aum   += c.total_aum;
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.aum - a.aum).slice(0, 6);
  }, [clients]);

  const maxAdviserAUM = Math.max(...adviserBuckets.map((d) => d.aum), 1);
  const totalAssetAUM = assetClasses.reduce((s, d) => s + d.value, 0);

  const displayAUM     = firmAUM?.total_aum || totalWrapperAUM;
  const displayClients = clients.length || firmAUM?.active_clients || 0;
  const avgAUM         = displayClients > 0 ? displayAUM / displayClients : 0;

  return (
    <PageShell title="Analytics">
      <div className="flex flex-col gap-6">

        {/* ── Stat strip ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total AUM"
            value={fmtCompact(displayAUM)}
            subtext={fmt(displayAUM)}
            icon={<PoundSterling className="w-4 h-4" />}
          />
          <StatCard
            label="Active Clients"
            value={String(displayClients)}
            subtext="across the firm"
            icon={<Users className="w-4 h-4" />}
          />
          <StatCard
            label="Avg AUM / Client"
            value={fmtCompact(avgAUM)}
            subtext={fmt(avgAUM)}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatCard
            label="Open Alerts"
            value={String(firmAUM?.pending_alerts ?? 0)}
            subtext="require attention"
            icon={<AlertCircle className="w-4 h-4" />}
          />
        </div>

        {/* ── Row 1: Wrapper donut + Risk profile ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ChartCard title="AUM by Wrapper Type" subtitle="Allocation across tax wrappers">
            <DonutChart
              data={wrapperSlices}
              total={totalWrapperAUM}
              centerLabel="Total AUM"
              loading={clientsLoading}
            />
            {!clientsLoading && wrapperSlices.length > 0 && (
              <SliceLegend data={wrapperSlices} total={totalWrapperAUM} />
            )}
            {!clientsLoading && wrapperSlices.length === 0 && (
              <ChartEmpty message="No wrapper data available" />
            )}
          </ChartCard>

          <ChartCard
            title="Risk Profile Distribution"
            subtitle="Clients and AUM by risk band"
          >
            {clientsLoading ? (
              <ChartLoader />
            ) : riskBuckets.length === 0 ? (
              <ChartEmpty />
            ) : (
              <div className="space-y-0.5 pt-2">
                {riskBuckets.map((d) => (
                  <HBar
                    key={d.key}
                    label={d.label}
                    value={d.aum}
                    maxValue={maxRiskAUM}
                    color={d.color}
                    note={`(${d.count})`}
                  />
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        {/* ── Row 2: Top clients leaderboard ── */}
        <ChartCard
          title="Top Clients by AUM"
          subtitle="Portfolio breakdown by tax wrapper — top 8 clients"
        >
          {clientsLoading ? (
            <div className="flex items-center justify-center" style={{ height: 280 }}>
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : topClients.length === 0 ? (
            <ChartEmpty />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={topClients.length * 44 + 16}>
                <BarChart
                  data={topClients}
                  layout="vertical"
                  barSize={24}
                  margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                >
                  <XAxis
                    type="number"
                    hide
                    domain={[0, maxClientAUM * 1.06]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip content={<StackedTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="SIPP" stackId="s" fill={WRAPPER_COLOR.SIPP} name="SIPP" />
                  <Bar dataKey="ISA"  stackId="s" fill={WRAPPER_COLOR.ISA}  name="ISA"  />
                  <Bar dataKey="GIA"  stackId="s" fill={WRAPPER_COLOR.GIA}  name="GIA"  />
                  <Bar dataKey="Bond" stackId="s" fill={WRAPPER_COLOR.BOND} name="Offshore Bond" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 justify-center mt-4 flex-wrap">
                {([
                  { key: "SIPP", label: "SIPP / Pension",    color: WRAPPER_COLOR.SIPP },
                  { key: "ISA",  label: "ISA / LISA / JISA", color: WRAPPER_COLOR.ISA  },
                  { key: "GIA",  label: "General Account",   color: WRAPPER_COLOR.GIA  },
                  { key: "Bond", label: "Offshore Bond",     color: WRAPPER_COLOR.BOND },
                ] as const).map(({ key, label, color }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-xs text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* ── Row 3: Asset class donut + AUM by adviser ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ChartCard
            title="Asset Class Allocation"
            subtitle="Firm-wide holdings breakdown by instrument type"
          >
            <DonutChart
              data={assetClasses}
              total={totalAssetAUM}
              centerLabel="in holdings"
              loading={assetsLoading}
            />
            {!assetsLoading && assetClasses.length > 0 && (
              <SliceLegend data={assetClasses} total={totalAssetAUM} />
            )}
            {!assetsLoading && assetClasses.length === 0 && (
              <ChartEmpty message="No holdings data available" />
            )}
          </ChartCard>

          <ChartCard
            title="AUM by Adviser"
            subtitle="Portfolio under management per adviser"
          >
            {clientsLoading ? (
              <ChartLoader />
            ) : adviserBuckets.length === 0 ? (
              <ChartEmpty />
            ) : (
              <div className="space-y-0.5 pt-2">
                {adviserBuckets.map((d, i) => (
                  <HBar
                    key={i}
                    label={d.name}
                    value={d.aum}
                    maxValue={maxAdviserAUM}
                    color="#002147"
                    note={`(${d.count})`}
                  />
                ))}
              </div>
            )}
          </ChartCard>

        </div>

      </div>
    </PageShell>
  );
}
