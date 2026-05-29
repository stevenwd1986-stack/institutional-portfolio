import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TxType =
  | "CASH_IN" | "CASH_OUT" | "IN_SPECIE_IN" | "IN_SPECIE_OUT"
  | "WITHDRAWAL" | "TAX_RELIEF" | "FEE" | "DIVIDEND" | "INTEREST"
  | "BUY" | "SELL" | "CONTRIBUTION" | "TRANSFER_IN_SPECIE"
  | "TRANSFER_OUT_SPECIE" | "TRANSFER_IN_CASH" | "TRANSFER_OUT_CASH"
  | "BENEFIT_CRYSTALLISATION" | "CORPORATE_ACTION_SPLIT"
  | "CORPORATE_ACTION_MERGE" | "TAX";

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

// ── Type mapping ──────────────────────────────────────────────────────────────

// Maps institutional portfolio's rich type to the advise-platform enum
const TO_DB_TYPE: Record<TxType, string> = {
  BUY:                     "buy",
  SELL:                    "sell",
  DIVIDEND:                "dividend",
  INTEREST:                "interest",
  FEE:                     "fee",
  TAX:                     "fee",
  CASH_IN:                 "contribution",
  CONTRIBUTION:            "contribution",
  TAX_RELIEF:              "contribution",
  CASH_OUT:                "withdrawal",
  WITHDRAWAL:              "withdrawal",
  BENEFIT_CRYSTALLISATION: "withdrawal",
  IN_SPECIE_IN:            "transfer_in",
  TRANSFER_IN_SPECIE:      "transfer_in",
  TRANSFER_IN_CASH:        "transfer_in",
  IN_SPECIE_OUT:           "transfer_out",
  TRANSFER_OUT_SPECIE:     "transfer_out",
  TRANSFER_OUT_CASH:       "transfer_out",
  CORPORATE_ACTION_SPLIT:  "buy",
  CORPORATE_ACTION_MERGE:  "sell",
};

// Maps advise-platform enum back, using metadata.institutional_tx_type if present
const FROM_DB_TYPE: Record<string, TxType> = {
  buy:          "BUY",
  sell:         "SELL",
  dividend:     "DIVIDEND",
  interest:     "INTEREST",
  fee:          "FEE",
  contribution: "CONTRIBUTION",
  withdrawal:   "WITHDRAWAL",
  transfer_in:  "TRANSFER_IN_CASH",
  transfer_out: "TRANSFER_OUT_CASH",
};

function toTxType(dbType: string, metadata: any): TxType {
  return (metadata?.institutional_tx_type as TxType) ?? FROM_DB_TYPE[dbType] ?? "BUY";
}

// ── Instrument lookup / create ────────────────────────────────────────────────

async function resolveInstrumentId(isin: string, name: string): Promise<string | null> {
  if (!isin) return null;

  const { data: existing } = await supabase
    .from("instruments")
    .select("id")
    .eq("isin", isin)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("instruments")
    .insert({ isin, name, currency: "GBP" })
    .select("id")
    .single();

  return created?.id ?? null;
}

// ── Read ──────────────────────────────────────────────────────────────────────

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

      // Build base query — filter by specific account or all client accounts
      let query = supabase
        .from("transactions")
        .select(`
          id, account_id, transaction_type, quantity, price, amount,
          settled_at, description, reference, metadata,
          instruments(isin, name),
          accounts!inner(client_id)
        `, { count: "exact" })
        .order("settled_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (wrapperId) {
        query = query.eq("account_id", wrapperId);
      } else {
        query = query.eq("accounts.client_id", clientId);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const transactions: TransactionRow[] = (data as any[]).map((t) => ({
        id:               t.id,
        wrapper_id:       t.account_id,
        transaction_type: toTxType(t.transaction_type, t.metadata),
        trade_date:       t.settled_at ? (t.settled_at as string).slice(0, 10) : "",
        asset_name:       t.description ?? t.instruments?.name ?? "",
        isin:             t.instruments?.isin ?? null,
        units:            t.quantity ?? null,
        price:            t.price ?? null,
        net_amount:       t.amount ?? 0,
        fees:             t.metadata?.fees ?? 0,
        notes:            t.reference ?? "",
        is_book_over:     t.metadata?.is_book_over ?? false,
      }));

      return { transactions, total: count ?? 0 };
    },
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

// ── Add ───────────────────────────────────────────────────────────────────────

export function useAddTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const instrumentId = await resolveInstrumentId(input.isin, input.asset_name);

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          account_id:       input.wrapper_id,
          instrument_id:    instrumentId,
          transaction_type: TO_DB_TYPE[input.transaction_type],
          quantity:         input.units     ? parseFloat(input.units)      : null,
          price:            input.price     ? parseFloat(input.price)      : null,
          amount:           parseFloat(input.net_amount) || 0,
          description:      input.asset_name || null,
          reference:        input.notes     || null,
          settled_at:       input.trade_date || null,
          metadata: {
            institutional_tx_type: input.transaction_type,
            fees:         parseFloat(input.fees) || 0,
            is_book_over: false,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
      const instrumentId = await resolveInstrumentId(input.isin, input.asset_name);

      const { data, error } = await supabase
        .from("transactions")
        .update({
          instrument_id:    instrumentId,
          transaction_type: TO_DB_TYPE[input.transaction_type],
          quantity:         input.units  ? parseFloat(input.units)  : null,
          price:            input.price  ? parseFloat(input.price)  : null,
          amount:           parseFloat(input.net_amount) || 0,
          description:      input.asset_name || null,
          reference:        input.notes      || null,
          settled_at:       input.trade_date || null,
          metadata: {
            institutional_tx_type: input.transaction_type,
            fees:         parseFloat(input.fees) || 0,
            is_book_over: false,
          },
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}
