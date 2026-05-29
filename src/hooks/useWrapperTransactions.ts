import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Bond transaction types ────────────────────────────────────────────────────

export type BondTxType = "PREMIUM" | "WITHDRAWAL" | "SEGMENT_ENCASHMENT";

export interface BondTransaction {
  id:          string;
  date:        string;   // ISO date
  type:        BondTxType;
  description: string;

  // PREMIUM
  premium_amount?: number;

  // WITHDRAWAL
  withdrawal_amount?: number;
  within_allowance?:  boolean;   // true if within cumulative 5% allowance
  excess_amount?:     number;    // chargeable event gain if any

  // SEGMENT_ENCASHMENT
  segments_encashed?: number;
  value_received?:    number;    // cash received for segments
  cost_of_segments?:  number;    // original cost basis of those segments
  chargeable_gain?:   number;    // value_received - cost_of_segments

  // Running totals AFTER this transaction
  running_premiums:           number;
  running_segments:           number;
  running_cost_basis:         number;
  running_allowance_used:     number;
  running_annual_allowance:   number;  // 5% of running_cost_basis
  running_cumul_allowance:    number;  // running_annual_allowance × years_at_point
}

// ── Demo seed data for w4 (James Thornton — RL360 bond) ──────────────────────

const INITIAL: BondTransaction = {
  id: "bt0",
  date: "2018-06-01",
  type: "PREMIUM",
  description: "Initial premium — 100 segments",
  premium_amount: 145_000,
  running_premiums:         145_000,
  running_segments:         100,
  running_cost_basis:       145_000,
  running_allowance_used:   0,
  running_annual_allowance: 7_250,
  running_cumul_allowance:  58_000,  // 8 years × £7,250
};

const SEED_TRANSACTIONS: Record<string, BondTransaction[]> = {
  w4: [INITIAL],
};

// ── Recompute all running totals from scratch ─────────────────────────────────

export function recompute(
  txns: BondTransaction[],
  yearsHeld: number
): BondTransaction[] {
  let premiums  = 0;
  let segments  = 0;
  let costBasis = 0;
  let allowUsed = 0;
  const sortedByDate = [...txns].sort((a, b) => a.date.localeCompare(b.date));

  return sortedByDate.map((t, i) => {
    // Estimate how many years have passed at this transaction
    const yearsAtPoint = yearsHeld * ((i + 1) / sortedByDate.length);

    if (t.type === "PREMIUM") {
      const amt = t.premium_amount ?? 0;
      premiums  += amt;
      costBasis += amt;
      // Original segment cost: from first transaction
      const origCostPerSeg = INITIAL.running_cost_basis / INITIAL.running_segments;
      segments  += Math.round(amt / origCostPerSeg);
    }

    if (t.type === "WITHDRAWAL") {
      allowUsed += t.withdrawal_amount ?? 0;
    }

    if (t.type === "SEGMENT_ENCASHMENT") {
      const costPerSeg = costBasis / Math.max(segments, 1);
      const encashed   = t.segments_encashed ?? 0;
      const costOfSegs = costPerSeg * encashed;
      costBasis -= costOfSegs;
      segments  -= encashed;
    }

    const annualAllow = costBasis * 0.05;
    const cumulAllow  = annualAllow * Math.max(1, Math.round(yearsAtPoint));

    return {
      ...t,
      running_premiums:         premiums,
      running_segments:         Math.max(0, segments),
      running_cost_basis:       Math.max(0, costBasis),
      running_allowance_used:   allowUsed,
      running_annual_allowance: annualAllow,
      running_cumul_allowance:  cumulAllow,
    };
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBondTransactions(wrapperId: string, yearsHeld = 8) {
  return useQuery<BondTransaction[]>({
    queryKey: ["bond-txns", wrapperId],
    queryFn:  async () => recompute(SEED_TRANSACTIONS[wrapperId] ?? [INITIAL], yearsHeld),
    staleTime: Infinity,
  });
}

// ── Add-transaction mutation ──────────────────────────────────────────────────

export interface NewPremiumInput {
  type: "PREMIUM";
  date: string;
  amount: number;
}

export interface NewWithdrawalInput {
  type: "WITHDRAWAL";
  date: string;
  amount: number;
  cumulative_allowance: number;
  allowance_used: number;
}

export interface NewEncashmentInput {
  type: "SEGMENT_ENCASHMENT";
  date: string;
  segments: number;
  current_cost_basis: number;
  current_segments: number;
  current_value: number;
}

export type NewBondTxInput =
  | NewPremiumInput
  | NewWithdrawalInput
  | NewEncashmentInput;

export function useAddBondTransaction(wrapperId: string, yearsHeld = 8) {
  const qc = useQueryClient();

  return useMutation<BondTransaction[], Error, NewBondTxInput>({
    mutationFn: async (input) => {
      const existing: BondTransaction[] = qc.getQueryData(["bond-txns", wrapperId]) ?? recompute(SEED_TRANSACTIONS[wrapperId] ?? [INITIAL], yearsHeld);

      const id = `bt-${Date.now()}`;
      let newTx: BondTransaction;

      if (input.type === "PREMIUM") {
        newTx = {
          id, date: input.date, type: "PREMIUM",
          description: "Premium payment",
          premium_amount: input.amount,
          // running totals recalculated below
          running_premiums: 0, running_segments: 0, running_cost_basis: 0,
          running_allowance_used: 0, running_annual_allowance: 0, running_cumul_allowance: 0,
        };
      } else if (input.type === "WITHDRAWAL") {
        const remaining = input.cumulative_allowance - input.allowance_used;
        const excess    = Math.max(0, input.amount - remaining);
        newTx = {
          id, date: input.date, type: "WITHDRAWAL",
          description: excess > 0
            ? `Withdrawal (£${excess.toLocaleString()} excess — chargeable event)`
            : "Partial withdrawal (within 5% allowance)",
          withdrawal_amount: input.amount,
          within_allowance:  excess === 0,
          excess_amount:     excess > 0 ? excess : undefined,
          running_premiums: 0, running_segments: 0, running_cost_basis: 0,
          running_allowance_used: 0, running_annual_allowance: 0, running_cumul_allowance: 0,
        };
      } else {
        // SEGMENT_ENCASHMENT
        const costPerSeg  = input.current_cost_basis / input.current_segments;
        const valuePerSeg = input.current_value / input.current_segments;
        const costOfSegs  = costPerSeg * input.segments;
        const valueRec    = valuePerSeg * input.segments;
        const gain        = valueRec - costOfSegs;
        newTx = {
          id, date: input.date, type: "SEGMENT_ENCASHMENT",
          description: `Encash ${input.segments} segment${input.segments !== 1 ? "s" : ""}`,
          segments_encashed: input.segments,
          value_received:    valueRec,
          cost_of_segments:  costOfSegs,
          chargeable_gain:   gain,
          running_premiums: 0, running_segments: 0, running_cost_basis: 0,
          running_allowance_used: 0, running_annual_allowance: 0, running_cumul_allowance: 0,
        };
      }

      const raw = [...(SEED_TRANSACTIONS[wrapperId] ?? [INITIAL]), newTx];
      SEED_TRANSACTIONS[wrapperId] = raw;
      return recompute(raw, yearsHeld);
    },
    onSuccess: (updated) => {
      qc.setQueryData(["bond-txns", wrapperId], updated);
    },
  });
}
