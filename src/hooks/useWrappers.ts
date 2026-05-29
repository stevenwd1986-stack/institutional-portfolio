import { useQuery } from "@tanstack/react-query";

// ── Sub-account ───────────────────────────────────────────────────────────────

export interface SubAccountSummary {
  id:       string;
  name:     string;
  type:     "DIRECT_HOLDINGS" | "DISCRETIONARY_MANDATE" | "SUB_GIA";
  manager?: string;   // DFM name when DISCRETIONARY_MANDATE
  value:    number;
}

// ── Wrapper summary ───────────────────────────────────────────────────────────

export interface WrapperSummary {
  id:                  string;
  wrapper_type:        "SIPP" | "ISA" | "GIA" | "OFFSHORE_BOND" | "LISA" | "JISA";
  platform:            string;
  value:               number;
  cost_basis:          number;
  performance_1y:      number;
  contributions_total: number;
  is_closed:           boolean;
  closed_date?:        string;   // ISO date — when transferred out / surrendered
  transferred_to?:     string;   // platform name if transferred
  transfer_note?:      string;   // e.g. "Bed & ISA to Transact ISA (w2)"
  sub_accounts:        SubAccountSummary[];
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_WRAPPERS: Record<string, WrapperSummary[]> = {

  // ── James Thornton ──────────────────────────────────────────────────────────
  c1: [
    {
      id: "w1", wrapper_type: "SIPP", platform: "Transact",
      value: 1_420_000, cost_basis: 980_000, performance_1y: 0.134,
      contributions_total: 950_000, is_closed: false,
      sub_accounts: [
        { id: "sa1-1", name: "Direct Holdings",           type: "DIRECT_HOLDINGS",       value: 940_000 },
        { id: "sa1-2", name: "Discretionary (Quilter WM)", type: "DISCRETIONARY_MANDATE", manager: "Quilter Wealth Management", value: 480_000 },
      ],
    },
    {
      id: "w2", wrapper_type: "ISA", platform: "Transact",
      value: 400_000, cost_basis: 360_000, performance_1y: 0.083,
      contributions_total: 360_000, is_closed: false,
      sub_accounts: [
        { id: "sa2-1", name: "Direct Holdings", type: "DIRECT_HOLDINGS", value: 400_000 },
      ],
    },
    {
      id: "w3", wrapper_type: "GIA", platform: "Finio",
      value: 850_000, cost_basis: 720_000, performance_1y: 0.099,
      contributions_total: 720_000, is_closed: false,
      sub_accounts: [
        { id: "sa3-1", name: "Direct Holdings",         type: "DIRECT_HOLDINGS",  value: 620_000 },
        { id: "sa3-2", name: "Income Sub-account",      type: "SUB_GIA",           value: 230_000 },
      ],
    },
    {
      id: "w4", wrapper_type: "OFFSHORE_BOND", platform: "RL360",
      value: 177_300, cost_basis: 145_000, performance_1y: 0.071,
      contributions_total: 145_000, is_closed: false,
      sub_accounts: [
        { id: "sa4-1", name: "GIA Sub-plan A",   type: "SUB_GIA", value: 112_400 },
        { id: "sa4-2", name: "GIA Sub-plan B",   type: "SUB_GIA", value:  64_900 },
      ],
    },
    // ── Historically closed — Quilter S&S ISA transferred to Transact ISA (w2) in Jan 2022
    {
      id: "w_hist_1", wrapper_type: "ISA", platform: "Quilter",
      value: 0, cost_basis: 198_000, performance_1y: 0,
      contributions_total: 198_000, is_closed: true,
      closed_date: "2022-01-14",
      transferred_to: "Transact",
      transfer_note: "In-specie transfer to Transact ISA (w2) — Jan 2022",
      sub_accounts: [],
    },
  ],

  // ── Robert Ashworth ─────────────────────────────────────────────────────────
  c3: [
    {
      id: "w5", wrapper_type: "SIPP", platform: "Quilter",
      value: 2_100_000, cost_basis: 1_600_000, performance_1y: 0.158,
      contributions_total: 1_600_000, is_closed: false,
      sub_accounts: [
        { id: "sa5-1", name: "Direct Holdings",            type: "DIRECT_HOLDINGS",       value: 1_500_000 },
        { id: "sa5-2", name: "Discretionary (Waverton AM)", type: "DISCRETIONARY_MANDATE", manager: "Waverton Asset Management", value: 600_000 },
      ],
    },
    {
      id: "w6", wrapper_type: "ISA", platform: "Quilter",
      value: 800_000, cost_basis: 680_000, performance_1y: 0.122,
      contributions_total: 680_000, is_closed: false,
      sub_accounts: [
        { id: "sa6-1", name: "Direct Holdings", type: "DIRECT_HOLDINGS", value: 800_000 },
      ],
    },
    {
      id: "w7", wrapper_type: "GIA", platform: "Transact",
      value: 1_100_000, cost_basis: 870_000, performance_1y: 0.163,
      contributions_total: 870_000, is_closed: false,
      sub_accounts: [
        { id: "sa7-1", name: "Direct Holdings",   type: "DIRECT_HOLDINGS", value: 800_000 },
        { id: "sa7-2", name: "Spouse Sub-account", type: "SUB_GIA",         value: 300_000 },
      ],
    },
    {
      id: "w8", wrapper_type: "OFFSHORE_BOND", platform: "Canada Life",
      value: 210_500, cost_basis: 175_000, performance_1y: 0.102,
      contributions_total: 175_000, is_closed: false,
      sub_accounts: [
        { id: "sa8-1", name: "GIA Sub-plan 1 — Growth",  type: "SUB_GIA", value: 140_000 },
        { id: "sa8-2", name: "GIA Sub-plan 2 — Income",  type: "SUB_GIA", value:  70_500 },
      ],
    },
    // ── Spousal ISA (APS) transferred in from deceased spouse — 2023
    {
      id: "w9", wrapper_type: "ISA", platform: "Transact",
      value: 145_000, cost_basis: 130_000, performance_1y: 0.099,
      contributions_total: 130_000, is_closed: false,
      sub_accounts: [
        { id: "sa9-1", name: "APS (Spousal Transfer)", type: "DIRECT_HOLDINGS", value: 145_000 },
      ],
    },
  ],
};

function generateDemoWrappers(clientId: string): WrapperSummary[] {
  if (DEMO_WRAPPERS[clientId]) return DEMO_WRAPPERS[clientId];
  return [
    {
      id: `w-${clientId}-sipp`, wrapper_type: "SIPP", platform: "Transact",
      value: 500_000, cost_basis: 400_000, performance_1y: 0.09,
      contributions_total: 400_000, is_closed: false,
      sub_accounts: [{ id: `sa-sipp-1`, name: "Direct Holdings", type: "DIRECT_HOLDINGS", value: 500_000 }],
    },
    {
      id: `w-${clientId}-isa`, wrapper_type: "ISA", platform: "Transact",
      value: 200_000, cost_basis: 180_000, performance_1y: 0.06,
      contributions_total: 180_000, is_closed: false,
      sub_accounts: [{ id: `sa-isa-1`, name: "Direct Holdings", type: "DIRECT_HOLDINGS", value: 200_000 }],
    },
  ];
}

export function useWrappers(clientId: string) {
  return useQuery<WrapperSummary[]>({
    queryKey:  ["wrappers", clientId],
    queryFn:   async () => generateDemoWrappers(clientId),
    staleTime: 1000 * 60 * 5,
  });
}
