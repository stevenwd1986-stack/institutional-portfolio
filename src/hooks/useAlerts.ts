import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AlertItem {
  id:          string;
  category:    "PERFORMANCE_ANOMALY" | "DATA_GAP" | "PENDING_TRANSFER" | "COMPLIANCE_FLAG" | "RECONCILIATION_ERROR";
  severity:    "INFO" | "WARNING" | "CRITICAL";
  title:       string;
  message:     string;
  clientName?: string;
  created_at:  string;
}

const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, INFO: 2 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// Strip possessive suffix to get a clean client name
function cleanPortfolioName(name: string): string {
  return name.replace(/'s\s+(Portfolio|Household|Account)$/i, "").trim();
}

// ── Alert generators ──────────────────────────────────────────────────────────

async function checkStalePrices(now: string): Promise<AlertItem[]> {
  // Holdings whose price hasn't been updated in more than 5 business days
  const cutoff = new Date(new Date(now).getTime() - 7 * 86_400_000).toISOString();

  const { data } = await supabase
    .from("holdings")
    .select(`
      id, updated_at, current_value,
      instruments(name, isin),
      accounts!inner(account_type, status, portfolio_id,
        portfolios!inner(name)
      )
    `)
    .eq("accounts.status", "active")
    .lt("updated_at", cutoff)
    .gt("current_value", 0)
    .limit(5);

  return (data ?? []).map((h: any) => ({
    id:         `stale-${h.id}`,
    category:   "DATA_GAP",
    severity:   "WARNING",
    title:      "Stale price data",
    message:    `${h.instruments?.name ?? "Holding"} has not been priced for ${daysAgo(h.updated_at)} days.`,
    clientName: cleanPortfolioName(h.accounts?.portfolios?.name ?? ""),
    created_at: h.updated_at,
  }));
}

async function checkMissingHoldings(now: string): Promise<AlertItem[]> {
  // Active accounts that have zero holdings
  const { data: accounts } = await supabase
    .from("accounts")
    .select(`
      id, account_type, provider_name,
      portfolios!inner(name)
    `)
    .eq("status", "active")
    .limit(50);

  if (!accounts?.length) return [];

  const accountIds = accounts.map((a: any) => a.id);
  const { data: holdingCounts } = await supabase
    .from("holdings")
    .select("account_id")
    .in("account_id", accountIds);

  const withHoldings = new Set((holdingCounts ?? []).map((h: any) => h.account_id));

  const alerts: AlertItem[] = [];
  for (const acct of accounts as any[]) {
    if (!withHoldings.has(acct.id)) {
      const type = acct.account_type?.toUpperCase().replace("_", " ") ?? "account";
      alerts.push({
        id:         `no-holdings-${acct.id}`,
        category:   "DATA_GAP",
        severity:   "WARNING",
        title:      "No holdings recorded",
        message:    `${type} with ${acct.provider_name ?? "unknown provider"} has no holdings — import may be required.`,
        clientName: cleanPortfolioName(acct.portfolios?.name ?? ""),
        created_at: now,
      });
    }
  }
  return alerts.slice(0, 5);
}

async function checkLargeUnrealisedLosses(): Promise<AlertItem[]> {
  // Holdings with > 15% unrealised loss where cost_basis is known
  const { data } = await supabase
    .from("holdings")
    .select(`
      id, current_value, cost_basis, updated_at,
      instruments(name),
      accounts!inner(account_type, status,
        portfolios!inner(name)
      )
    `)
    .eq("accounts.status", "active")
    .gt("cost_basis", 0)
    .limit(100);

  const alerts: AlertItem[] = [];
  for (const h of (data ?? []) as any[]) {
    const loss = (h.current_value - h.cost_basis) / h.cost_basis;
    if (loss < -0.15) {
      alerts.push({
        id:         `loss-${h.id}`,
        category:   "PERFORMANCE_ANOMALY",
        severity:   loss < -0.25 ? "CRITICAL" : "WARNING",
        title:      "Large unrealised loss",
        message:    `${h.instruments?.name ?? "Holding"} is down ${(loss * 100).toFixed(1)}% (${fmt(h.current_value - h.cost_basis)}) vs cost basis.`,
        clientName: cleanPortfolioName(h.accounts?.portfolios?.name ?? ""),
        created_at: h.updated_at ?? new Date().toISOString(),
      });
    }
  }
  return alerts.slice(0, 5);
}

async function checkMissingCostBasis(): Promise<AlertItem[]> {
  // Holdings with value > £500 but no cost basis recorded
  const { data } = await supabase
    .from("holdings")
    .select(`
      id, current_value, updated_at,
      instruments(name),
      accounts!inner(account_type, status,
        portfolios!inner(name)
      )
    `)
    .eq("accounts.status", "active")
    .or("cost_basis.is.null,cost_basis.eq.0")
    .gt("current_value", 500)
    .limit(5);

  return (data ?? []).map((h: any) => ({
    id:         `no-cost-${h.id}`,
    category:   "RECONCILIATION_ERROR",
    severity:   "WARNING",
    title:      "Missing cost basis",
    message:    `Cost basis not recorded for ${h.instruments?.name ?? "holding"} (current value ${fmt(h.current_value)}) — CGT calculations will be inaccurate.`,
    clientName: cleanPortfolioName(h.accounts?.portfolios?.name ?? ""),
    created_at: h.updated_at ?? new Date().toISOString(),
  }));
}

async function checkConcentration(): Promise<AlertItem[]> {
  // Holdings representing > 60% of account value
  const { data: accounts } = await supabase
    .from("accounts")
    .select(`
      id, account_type,
      portfolios!inner(name),
      holdings(id, current_value, instruments(name))
    `)
    .eq("status", "active")
    .limit(30);

  const alerts: AlertItem[] = [];
  for (const acct of (accounts ?? []) as any[]) {
    const holdings: any[] = acct.holdings ?? [];
    const total = holdings.reduce((s: number, h: any) => s + (h.current_value ?? 0), 0);
    if (total < 1000) continue;

    for (const h of holdings) {
      const pct = (h.current_value ?? 0) / total;
      if (pct > 0.6) {
        alerts.push({
          id:         `concentration-${h.id}`,
          category:   "COMPLIANCE_FLAG",
          severity:   "INFO",
          title:      "High concentration",
          message:    `${h.instruments?.name ?? "Holding"} is ${(pct * 100).toFixed(0)}% of the ${acct.account_type?.toUpperCase() ?? "account"} — consider diversification.`,
          clientName: cleanPortfolioName(acct.portfolios?.name ?? ""),
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  return alerts.slice(0, 5);
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useAlerts() {
  return useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn:  async () => {
      if (!isSupabaseConfigured) return [];

      const now = new Date().toISOString();

      const [stale, noHoldings, losses, noCost, concentration] = await Promise.all([
        checkStalePrices(now).catch(() => [] as AlertItem[]),
        checkMissingHoldings(now).catch(() => [] as AlertItem[]),
        checkLargeUnrealisedLosses().catch(() => [] as AlertItem[]),
        checkMissingCostBasis().catch(() => [] as AlertItem[]),
        checkConcentration().catch(() => [] as AlertItem[]),
      ]);

      const all = [...stale, ...noHoldings, ...losses, ...noCost, ...concentration];

      // Sort: CRITICAL first, then WARNING, then INFO, then by date desc
      all.sort((a, b) => {
        const sevDiff = (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2);
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return all.slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
  });
}
