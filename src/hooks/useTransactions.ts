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

// ── Type mapping: Supabase txn_type (lowercase) <-> app TxType (uppercase) ───

const FROM_DB: Record<string, TxType> = {
  buy:               "BUY",
  sell:              "SELL",
  deposit:           "CASH_IN",
  withdrawal:        "WITHDRAWAL",
  dividend_cash:     "DIVIDEND",
  fee:               "FEE",
  tax:               "TAX",
  manual_adjustment: "CASH_IN",
  notional_income:   "INTEREST",
  transfer_in:       "TRANSFER_IN_CASH",
  transfer_out:      "TRANSFER_OUT_CASH",
};

const TO_DB: Partial<Record<TxType, string>> = {
  BUY:                     "buy",
  SELL:                    "sell",
  CASH_IN:                 "deposit",
  CASH_OUT:                "withdrawal",
  WITHDRAWAL:              "withdrawal",
  TAX_RELIEF:              "deposit",
  FEE:                     "fee",
  DIVIDEND:                "dividend_cash",
  INTEREST:                "notional_income",
  IN_SPECIE_IN:            "transfer_in",
  IN_SPECIE_OUT:           "transfer_out",
  CONTRIBUTION:            "deposit",
  TRANSFER_IN_SPECIE:      "transfer_in",
  TRANSFER_OUT_SPECIE:     "transfer_out",
  TRANSFER_IN_CASH:        "transfer_in",
  TRANSFER_OUT_CASH:       "transfer_out",
  BENEFIT_CRYSTALLISATION: "manual_adjustment",
  CORPORATE_ACTION_SPLIT:  "manual_adjustment",
  CORPORATE_ACTION_MERGE:  "manual_adjustment",
  TAX:                     "tax",
};

// ── DB row → TransactionRow ───────────────────────────────────────────────────

function mapRow(tx: any): TransactionRow {
  return {
    id:               tx.id,
    wrapper_id:       tx.account_id,
    transaction_type: FROM_DB[tx.txn_type] ?? "CASH_IN",
    trade_date:       tx.trade_date,
    asset_name:       tx.instruments?.name ?? "",
    isin:             tx.instruments?.isin ?? null,
    units:            tx.quantity   != null ? parseFloat(tx.quantity)   : null,
    price:            tx.price_quote != null
      ? parseFloat(tx.price_quote) / (tx.price_scale ?? 1)
      : null,
    net_amount:       parseFloat(tx.gross_amount_gbp) ?? 0,
    fees:             parseFloat(tx.fees_gbp) ?? 0,
    notes:            tx.notes ?? "",
    is_book_over:     false,
  };
}

const TX_SELECT = `
  id, txn_type, trade_date, quantity, price_quote, price_scale,
  gross_amount_gbp, fees_gbp, notes, account_id,
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

      // Resolve account IDs for this client/wrapper
      let accountIds: string[];
      if (wrapperId) {
        accountIds = [wrapperId];
      } else {
        const { data: accts } = await supabase
          .from("accounts")
          .select("id")
          .eq("portfolio_id", clientId);
        accountIds = (accts ?? []).map((a: any) => a.id);
      }

      if (accountIds.length === 0) return { transactions: [], total: 0 };

      const from = page * pageSize;
      const to   = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("transactions")
        .select(TX_SELECT, { count: "exact" })
        .in("account_id", accountIds)
        .order("trade_date",  { ascending: false })
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

      // Resolve instrument_id from ISIN if provided
      let instrument_id: string | null = null;
      if (input.isin?.trim()) {
        const { data: inst } = await supabase
          .from("instruments")
          .select("id")
          .eq("isin", input.isin.trim())
          .maybeSingle();
        instrument_id = inst?.id ?? null;
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          account_id:         input.wrapper_id,
          instrument_id,
          txn_type:           TO_DB[input.transaction_type] ?? "deposit",
          trade_date:         input.trade_date,
          quantity:           input.units  ? parseFloat(input.units)  : null,
          price_quote:        input.price  ? parseFloat(input.price)  : null,
          price_currency:     "GBP",
          price_scale:        input.price  ? 1                        : null,
          fx_rate_to_gbp:     1.0,
          gross_amount_gbp:   parseFloat(input.net_amount) || 0,
          fees_gbp:           parseFloat(input.fees) || 0,
          sdrt_gbp:           0,
          tax_gbp:            0,
          notes:              input.notes || null,
          affects_cost_basis: false,
          created_by:         userId,
          updated_by:         userId,
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

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;

      const { data, error } = await supabase
        .from("transactions")
        .update({
          account_id:       input.wrapper_id,
          instrument_id,
          txn_type:         TO_DB[input.transaction_type] ?? "deposit",
          trade_date:       input.trade_date,
          quantity:         input.units  ? parseFloat(input.units)  : null,
          price_quote:      input.price  ? parseFloat(input.price)  : null,
          price_currency:   "GBP",
          price_scale:      input.price  ? 1                        : null,
          gross_amount_gbp: parseFloat(input.net_amount) || 0,
          fees_gbp:         parseFloat(input.fees) || 0,
          notes:            input.notes || null,
          updated_by:       userId,
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
