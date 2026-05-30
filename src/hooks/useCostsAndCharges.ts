import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HoldingCost {
  instrument_id:    string;
  name:             string;
  isin:             string | null;
  instrument_type:  string;
  ocf_pct:          number | null;
  net_quantity:     number;
  /** market value if a price exists, otherwise falls back to cost basis */
  value:            number;
  using_cost_basis: boolean;
  annual_ocf_cost:  number;
}

export interface AccountCosts {
  account_id:   string;
  account_name: string;
  account_type: string;
  provider_name: string | null;
  // Stored fee %
  platform_pct:  number | null;   // scheme_amc_pct
  adviser_pct:   number | null;
  dim_pct:       number | null;
  // Computed values
  total_value:         number;
  weighted_ocf_pct:    number;
  annual_platform_cost: number;
  annual_ocf_cost:     number;
  annual_adviser_cost: number;
  annual_dim_cost:     number;
  annual_total_cost:   number;
  total_cost_pct:      number;
  holdings: HoldingCost[];
}

export interface ClientCosts {
  client_id:   string;
  client_name: string;
  total_aum:            number;
  annual_platform_cost: number;
  annual_ocf_cost:      number;
  annual_adviser_cost:  number;
  annual_dim_cost:      number;
  annual_total_cost:    number;
  total_cost_pct:       number;
  accounts: AccountCosts[];
}

export interface CostsBreakdown {
  clients:           ClientCosts[];
  total_aum:         number;
  annual_total_cost: number;
  total_cost_pct:    number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RpcRow = Record<string, string | null>;

function n(v: string | null | undefined): number {
  if (v == null) return 0;
  const f = parseFloat(v);
  return isNaN(f) ? 0 : f;
}

function nullable(v: string | null | undefined): number | null {
  if (v == null) return null;
  const f = parseFloat(v);
  return isNaN(f) ? null : f;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export function useCostsBreakdown() {
  return useQuery<CostsBreakdown>({
    queryKey: ["costs-breakdown"],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return { clients: [], total_aum: 0, annual_total_cost: 0, total_cost_pct: 0 };
      }

      const { data, error } = await supabase.rpc("get_costs_breakdown");
      if (error) throw error;

      const clientMap  = new Map<string, ClientCosts>();
      const accountMap = new Map<string, AccountCosts>();

      for (const raw of (data ?? []) as RpcRow[]) {
        // ── client ──
        if (!clientMap.has(raw.client_id!)) {
          clientMap.set(raw.client_id!, {
            client_id:            raw.client_id!,
            client_name:          raw.client_name ?? "Unknown",
            total_aum:            0,
            annual_platform_cost: 0,
            annual_ocf_cost:      0,
            annual_adviser_cost:  0,
            annual_dim_cost:      0,
            annual_total_cost:    0,
            total_cost_pct:       0,
            accounts: [],
          });
        }
        const client = clientMap.get(raw.client_id!)!;

        // ── account ──
        if (!accountMap.has(raw.account_id!)) {
          const acct: AccountCosts = {
            account_id:           raw.account_id!,
            account_name:         raw.account_name ?? "",
            account_type:         raw.account_type ?? "",
            provider_name:        raw.provider_name ?? null,
            platform_pct:         nullable(raw.scheme_amc_pct),
            adviser_pct:          nullable(raw.adviser_charge_pct),
            dim_pct:              nullable(raw.dim_fee_pct),
            total_value:          0,
            weighted_ocf_pct:     0,
            annual_platform_cost: 0,
            annual_ocf_cost:      0,
            annual_adviser_cost:  0,
            annual_dim_cost:      0,
            annual_total_cost:    0,
            total_cost_pct:       0,
            holdings: [],
          };
          accountMap.set(raw.account_id!, acct);
          client.accounts.push(acct);
        }
        const account = accountMap.get(raw.account_id!)!;

        // ── holding ──
        const marketVal  = n(raw.market_value_gbp);
        const costBasis  = n(raw.units) * n(raw.avg_cost_basis);
        const usesCost   = marketVal <= 0 && costBasis > 0;
        const value      = marketVal > 0 ? marketVal : costBasis;
        const ocfPct     = nullable(raw.ocf_pct);

        account.holdings.push({
          instrument_id:   raw.instrument_id!,
          name:            raw.instrument_name ?? "Unknown",
          isin:            raw.isin ?? null,
          instrument_type: raw.instrument_type ?? "",
          ocf_pct:         ocfPct,
          net_quantity:    n(raw.units),
          value,
          using_cost_basis: usesCost,
          annual_ocf_cost:  ocfPct != null ? value * (ocfPct / 100) : 0,
        });
        account.total_value += value;
      }

      // ── account-level aggregates ──
      for (const account of accountMap.values()) {
        let weightedOcf = 0;
        if (account.total_value > 0) {
          for (const h of account.holdings) {
            if (h.ocf_pct != null) {
              weightedOcf += (h.value / account.total_value) * h.ocf_pct;
            }
          }
        }
        account.weighted_ocf_pct    = weightedOcf;
        const v = account.total_value;
        account.annual_platform_cost = v * (account.platform_pct ?? 0) / 100;
        account.annual_ocf_cost      = v * weightedOcf / 100;
        account.annual_adviser_cost  = v * (account.adviser_pct ?? 0) / 100;
        account.annual_dim_cost      = v * (account.dim_pct ?? 0) / 100;
        account.annual_total_cost    =
          account.annual_platform_cost + account.annual_ocf_cost +
          account.annual_adviser_cost  + account.annual_dim_cost;
        account.total_cost_pct       =
          v > 0 ? (account.annual_total_cost / v) * 100 : 0;
      }

      // ── client-level rollup ──
      for (const client of clientMap.values()) {
        for (const a of client.accounts) {
          client.total_aum            += a.total_value;
          client.annual_platform_cost += a.annual_platform_cost;
          client.annual_ocf_cost      += a.annual_ocf_cost;
          client.annual_adviser_cost  += a.annual_adviser_cost;
          client.annual_dim_cost      += a.annual_dim_cost;
          client.annual_total_cost    += a.annual_total_cost;
        }
        client.total_cost_pct =
          client.total_aum > 0
            ? (client.annual_total_cost / client.total_aum) * 100
            : 0;
      }

      const clients          = Array.from(clientMap.values());
      const total_aum        = clients.reduce((s, c) => s + c.total_aum,         0);
      const annual_total_cost = clients.reduce((s, c) => s + c.annual_total_cost, 0);

      return {
        clients,
        total_aum,
        annual_total_cost,
        total_cost_pct: total_aum > 0 ? (annual_total_cost / total_aum) * 100 : 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

export interface UpdateFeesParams {
  accountId:    string;
  platform_pct: number | null;
  adviser_pct:  number | null;
  dim_pct:      number | null;
}

export function useUpdateAccountFees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, platform_pct, adviser_pct, dim_pct }: UpdateFeesParams) => {
      const { error } = await supabase
        .from("tax_wrappers")
        .update({
          scheme_amc_pct:     platform_pct,
          adviser_charge_pct: adviser_pct,
          dim_fee_pct:        dim_pct,
        })
        .eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["costs-breakdown"] });
    },
  });
}
