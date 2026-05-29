import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  // legacy / display-only types from imports
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
  transaction_type: TxType;
  trade_date:       string;    // ISO date
  asset_name:       string;
  isin:             string | null;
  units:            number | null;
  price:            number | null;
  net_amount:       number;
  fees:             number;
  notes:            string;
  is_book_over:     boolean;
}

// ── Editable input shape ──────────────────────────────────────────────────────

export interface TransactionInput {
  transaction_type: TxType;
  trade_date:       string;
  asset_name:       string;
  isin:             string;
  units:            string;   // string from form inputs, parsed on save
  price:            string;
  net_amount:       string;
  fees:             string;
  notes:            string;
}

// ── Mutable in-memory store ───────────────────────────────────────────────────

const STORE: Record<string, TransactionRow[]> = {
  default: [
    { id: "t1",  transaction_type: "BUY",              trade_date: "2026-05-20", asset_name: "iShares Core MSCI World ETF",      isin: "IE00B4L5Y983", units: 500,     price: 97.82,  net_amount:  48_910,  fees: 25,    notes: "", is_book_over: false },
    { id: "t2",  transaction_type: "DIVIDEND",          trade_date: "2026-05-15", asset_name: "Fidelity Global Dividend",           isin: "GB00B7778087", units: null,    price: null,   net_amount:   1_240,  fees:  0,    notes: "", is_book_over: false },
    { id: "t3",  transaction_type: "SELL",              trade_date: "2026-05-10", asset_name: "Artemis UK Select",                  isin: "GB00B2PDCS86", units: 10_000, price: 3.08,   net_amount:  30_775,  fees: 25,    notes: "", is_book_over: false },
    { id: "t4",  transaction_type: "IN_SPECIE_IN",      trade_date: "2026-04-22", asset_name: "Vanguard S&P 500 ETF (Acc)",         isin: "IE00BFMXXD54", units: 4_000,  price: 95.50,  net_amount: 382_000,  fees:  0,    notes: "In-specie transfer in — book-over", is_book_over: true  },
    { id: "t5",  transaction_type: "IN_SPECIE_OUT",     trade_date: "2026-04-22", asset_name: "Vanguard S&P 500 ETF (Acc)",         isin: "IE00BFMXXD54", units: 4_000,  price: 95.50,  net_amount: -382_000, fees:  0,    notes: "In-specie transfer out — book-over", is_book_over: true },
    { id: "t6",  transaction_type: "FEE",               trade_date: "2026-04-01", asset_name: "Platform fee Q1 2026",               isin: null,           units: null,    price: null,   net_amount:  -1_180,  fees: 1_180, notes: "", is_book_over: false },
    { id: "t7",  transaction_type: "CASH_IN",           trade_date: "2026-03-31", asset_name: "SIPP contribution",                  isin: null,           units: null,    price: null,   net_amount:  40_000,  fees:  0,    notes: "", is_book_over: false },
    { id: "t8",  transaction_type: "TAX_RELIEF",        trade_date: "2026-03-31", asset_name: "HMRC basic rate tax relief",          isin: null,           units: null,    price: null,   net_amount:  10_000,  fees:  0,    notes: "20% basic rate relief on £40,000 contribution", is_book_over: false },
    { id: "t9",  transaction_type: "BUY",               trade_date: "2026-03-15", asset_name: "Baillie Gifford American B Acc",     isin: "GB0006063233", units: 2_000,  price: 10.10,  net_amount:  20_200,  fees: 15,    notes: "", is_book_over: false },
    { id: "t10", transaction_type: "DIVIDEND",          trade_date: "2026-02-15", asset_name: "Legal & General Global 100 Index",   isin: "GB00B0CNH708", units: null,    price: null,   net_amount:     890,  fees:  0,    notes: "", is_book_over: false },
    { id: "t11", transaction_type: "WITHDRAWAL",        trade_date: "2026-01-20", asset_name: "Income drawdown",                    isin: null,           units: null,    price: null,   net_amount:  -5_000,  fees:  0,    notes: "Regular income drawdown", is_book_over: false },
    { id: "t12", transaction_type: "INTEREST",          trade_date: "2026-01-15", asset_name: "Cash account interest",              isin: null,           units: null,    price: null,   net_amount:     312,  fees:  0,    notes: "", is_book_over: false },
    { id: "t13", transaction_type: "CASH_OUT",          trade_date: "2025-12-20", asset_name: "Ad-hoc withdrawal",                  isin: null,           units: null,    price: null,   net_amount:  -8_500,  fees:  0,    notes: "", is_book_over: false },
  ],
};

function getStore(clientId: string): TransactionRow[] {
  return STORE[clientId] ?? STORE["default"];
}

function setStore(clientId: string, rows: TransactionRow[]) {
  STORE[clientId] = rows;
  // Also keep default in sync for clients that fall through
  if (!STORE[clientId]) STORE["default"] = rows;
}

// ── Query ─────────────────────────────────────────────────────────────────────

export function useTransactions(clientId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey:  ["transactions", clientId, page, pageSize],
    queryFn:   async () => {
      const all   = getStore(clientId);
      const start = page * pageSize;
      return { transactions: all.slice(start, start + pageSize), total: all.length };
    },
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

// ── Add mutation ──────────────────────────────────────────────────────────────

export function useAddTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const newRow: TransactionRow = {
        id:               `tx-${Date.now()}`,
        transaction_type: input.transaction_type,
        trade_date:       input.trade_date,
        asset_name:       input.asset_name || txDefaultAssetName(input.transaction_type),
        isin:             input.isin || null,
        units:            input.units ? parseFloat(input.units) : null,
        price:            input.price ? parseFloat(input.price) : null,
        net_amount:       parseFloat(input.net_amount) || 0,
        fees:             parseFloat(input.fees) || 0,
        notes:            input.notes,
        is_book_over:     false,
      };
      const rows = [newRow, ...getStore(clientId)];
      setStore(clientId, rows);
      return newRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── Edit mutation ─────────────────────────────────────────────────────────────

export function useUpdateTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
      const rows = getStore(clientId).map((r) =>
        r.id !== id ? r : {
          ...r,
          transaction_type: input.transaction_type,
          trade_date:       input.trade_date,
          asset_name:       input.asset_name || txDefaultAssetName(input.transaction_type),
          isin:             input.isin || null,
          units:            input.units ? parseFloat(input.units) : null,
          price:            input.price ? parseFloat(input.price) : null,
          net_amount:       parseFloat(input.net_amount) || 0,
          fees:             parseFloat(input.fees) || 0,
          notes:            input.notes,
        }
      );
      setStore(clientId, rows);
      return rows.find((r) => r.id === id)!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── Delete mutation ───────────────────────────────────────────────────────────

export function useDeleteTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      setStore(clientId, getStore(clientId).filter((r) => r.id !== id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function txDefaultAssetName(type: TxType): string {
  const map: Partial<Record<TxType, string>> = {
    CASH_IN:    "Cash deposit",
    CASH_OUT:   "Cash withdrawal",
    WITHDRAWAL: "Income withdrawal",
    TAX_RELIEF: "HMRC tax relief",
    FEE:        "Platform fee",
    INTEREST:   "Cash interest",
  };
  return map[type] ?? "";
}
