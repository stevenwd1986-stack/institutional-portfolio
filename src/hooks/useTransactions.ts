import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TxType =
  | "CASH_IN"
  | "CASH_OUT"
  | "IN_SPECIE_IN"
  | "IN_SPECIE_OUT"
  | "WITHDRAWAL"
  | "TAX_RELIEF"
  | "FEE"
  | "DIVIDEND"
  | "INTEREST"
  | "BUY"
  | "SELL"
  | "CONTRIBUTION"
  | "TRANSFER_IN_SPECIE"
  | "TRANSFER_OUT_SPECIE"
  | "TRANSFER_IN_CASH"
  | "TRANSFER_OUT_CASH"
  | "BENEFIT_CRYSTALLISATION"
  | "CORPORATE_ACTION_SPLIT"
  | "CORPORATE_ACTION_MERGE"
  | "TAX";

export interface TransactionRow {
  id:               string;
  wrapper_id:       string;
  transaction_type: TxType;
  trade_date:       string;
  asset_name:       string;
  isin:             string | null;
  units:            number | null;
  price:            number | null;
  net_amount:       number;
  fees:             number;
  notes:            string;
  is_book_over:     boolean;
}

export interface TransactionInput {
  wrapper_id:       string;
  transaction_type: TxType;
  trade_date:       string;
  asset_name:       string;
  isin:             string;
  units:            string;
  price:            string;
  net_amount:       string;
  fees:             string;
  notes:            string;
}

// ── Type mapping: advise-platform enum (lowercase) ↔ institutional TxType ─────
//
// The advise-platform transactions table uses a simpler enum:
//   buy, sell, dividend, interest, fee, transfer_in, transfer_out,
//   contribution, withdrawal
//
// Extended institutional types (CASH_IN, TAX_RELIEF, IN_SPECIE_IN, …) that
// don't map 1:1 are stored in the row's metadata.tx_type JSONB field
// (added by migration 017_transactions_metadata_write_policies.sql).
// On read we prefer metadata.tx_type when present.

const FROM_DB: Record<string, TxType> = {
  buy:          "BUY",
  sell:         "SELL",
  dividend:     "DIVIDEND",
  interest:     "INTEREST",
  fee:          "FEE",
  transfer_in:  "TRANSFER_IN_CASH",
  transfer_out: "TRANSFER_OUT_CASH",
  contribution: "CONTRIBUTION",
  withdrawal:   "WITHDRAWAL",
};

// Best-fit base enum type for each institutional TxType
const TO_DB: Partial<Record<TxType, string>> = {
  BUY:                     "buy",
  SELL:                    "sell",
  CASH_IN:                 "contribution",
  CASH_OUT:                "withdrawal",
  WITHDRAWAL:              "withdrawal",
  TAX_RELIEF:              "contribution",
  FEE:                     "fee",
  DIVIDEND:                "dividend",
  INTEREST:                "interest",
  IN_SPECIE_IN:            "transfer_in",
  IN_SPECIE_OUT:           "transfer_out",
  CONTRIBUTION:            "contribution",
  TRANSFER_IN_SPECIE:      "transfer_in",
  TRANSFER_OUT_SPECIE:     "transfer_out",
  TRANSFER_IN_CASH:        "transfer_in",
  TRANSFER_OUT_CASH:       "transfer_out",
  BENEFIT_CRYSTALLISATION: "withdrawal",
  CORPORATE_ACTION_SPLIT:  "buy",
  CORPORATE_ACTION_MERGE:  "buy",
  TAX:                     "fee",
};

// ── DB row → TransactionRow ───────────────────────────────────────────────────

function mapRow(tx: any): TransactionRow {
  const meta: Record<string, any> = tx.metadata ?? {};

  // Extended institutional type stored in metadata wins over the enum
  const txType: TxType =
    (meta.tx_type as TxType | undefined) ??
    FROM_DB[tx.transaction_type] ??
    "CASH_IN";

  // Trade date: use settled_at when present (it stores the transaction date)
  const tradeDate = tx.settled_at
    ? (tx.settled_at as string).slice(0, 10)
    : (tx.created_at as string).slice(0, 10);

  return {
    id:               tx.id,
    wrapper_id:       tx.account_id,
    transaction_type: txType,
    trade_date:       tradeDate,
    // Prefer joined instrument name, then metadata asset_name, then description
    asset_name:       tx.instruments?.name ?? meta.asset_name ?? tx.description ?? "",
    isin:             tx.instruments?.isin ?? null,
    units:            tx.quantity != null ? parseFloat(tx.quantity) : null,
    price:            tx.price    != null ? parseFloat(tx.price)    : null,
    net_amount:       parseFloat(tx.amount) ?? 0,
    fees:             meta.fees   != null ? parseFloat(meta.fees)   : 0,
    notes:            meta.notes  ?? tx.description ?? "",
    is_book_over:     meta.is_book_over ?? false,
  };
}

const TX_SELECT = `
  id, transaction_type, settled_at, created_at,
  quantity, price, amount, description, metadata, account_id,
  instruments(name, isin)
`;

// ── useTransactions ───────────────────────────────────────────────────────────

export function useTransactions(
  clientId:   string,
  page:       number,
  pageSize:   number,
  wrapperId?: string,
) {
  return useQuery({
    queryKey:  ["transactions", clientId, page, pageSize, wrapperId ?? "all"],
    queryFn:   async () => {
      if (!isSupabaseConfigured) return { transactions: [], total: 0 };

      // Resolve which account IDs to query
      let accountIds: string[];
      if (wrapperId) {
        accountIds = [wrapperId];
      } else {
        const { data: accts } = await supabase
          .from("accounts")
          .select("id")
          .eq("client_id", clientId);
        accountIds = (accts ?? []).map((a: any) => a.id);
      }

      if (accountIds.length === 0) return { transactions: [], total: 0 };

      const from = page * pageSize;
      const to   = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("transactions")
        .select(TX_SELECT, { count: "exact" })
        .in("account_id", accountIds)
        // Sort newest first; settled_at may be null so fall back to created_at
        .order("settled_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        transactions: (data as any[]).map(mapRow),
        total:        count ?? (data as any[]).length,
      };
    },
    staleTime:        0,
    placeholderData: (prev) => prev,
  });
}

// ── useAddTransaction ─────────────────────────────────────────────────────────

export function useAddTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!isSupabaseConfigured) throw new Error("Supabase not configured");

      // Look up instrument_id by ISIN if provided
      let instrument_id: string | null = null;
      if (input.isin?.trim()) {
        const { data: inst } = await supabase
          .from("instruments")
          .select("id")
          .eq("isin", input.isin.trim())
          .maybeSingle();
        instrument_id = inst?.id ?? null;
      }

      // Store extended institutional fields in metadata
      const metadata: Record<string, unknown> = {
        tx_type:     input.transaction_type,
        asset_name:  input.asset_name || undefined,
        fees:        input.fees ? parseFloat(input.fees) : 0,
        is_book_over: false,
        notes:       input.notes || undefined,
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          account_id:       input.wrapper_id,
          instrument_id,
          transaction_type: TO_DB[input.transaction_type] ?? "contribution",
          quantity:         input.units ? parseFloat(input.units) : null,
          price:            input.price ? parseFloat(input.price) : null,
          amount:           parseFloat(input.net_amount) || 0,
          currency:         "GBP",
          settled_at:       input.trade_date,   // trade_date stored as settled_at
          description:      input.asset_name || txDefaultDescription(input.transaction_type),
          metadata,
        })
        .select(TX_SELECT)
        .single();

      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── useUpdateTransaction ──────────────────────────────────────────────────────

export function useUpdateTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
      if (!isSupabaseConfigured) throw new Error("Supabase not configured");

      let instrument_id: string | null = null;
      if (input.isin?.trim()) {
        const { data: inst } = await supabase
          .from("instruments")
          .select("id")
          .eq("isin", input.isin.trim())
          .maybeSingle();
        instrument_id = inst?.id ?? null;
      }

      const metadata: Record<string, unknown> = {
        tx_type:      input.transaction_type,
        asset_name:   input.asset_name || undefined,
        fees:         input.fees ? parseFloat(input.fees) : 0,
        is_book_over: false,
        notes:        input.notes || undefined,
      };

      const { data, error } = await supabase
        .from("transactions")
        .update({
          account_id:       input.wrapper_id,
          instrument_id,
          transaction_type: TO_DB[input.transaction_type] ?? "contribution",
          quantity:         input.units ? parseFloat(input.units) : null,
          price:            input.price ? parseFloat(input.price) : null,
          amount:           parseFloat(input.net_amount) || 0,
          currency:         "GBP",
          settled_at:       input.trade_date,
          description:      input.asset_name || txDefaultDescription(input.transaction_type),
          metadata,
        })
        .eq("id", id)
        .select(TX_SELECT)
        .single();

      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── useDeleteTransaction ──────────────────────────────────────────────────────

export function useDeleteTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured) throw new Error("Supabase not configured");
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function txDefaultDescription(type: TxType): string {
  const map: Partial<Record<TxType, string>> = {
    CASH_IN:    "Cash deposit",
    CASH_OUT:   "Cash withdrawal",
    WITHDRAWAL: "Income withdrawal",
    TAX_RELIEF: "HMRC tax relief",
    FEE:        "Platform fee",
    INTEREST:   "Cash interest",
    CONTRIBUTION: "Contribution",
  };
  return map[type] ?? "";
}
