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
  wrapper_id:       string;          // which account this belongs to
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

// ── Demo seed — c1 (James Thornton) transactions spread across wrappers ───────
// w1 = SIPP/Transact, w2 = ISA/Transact, w3 = GIA/Finio, w4 = Offshore Bond/RL360

const C1_TRANSACTIONS: TransactionRow[] = [
  // ── SIPP (w1) ──────────────────────────────────────────────────────────────
  { id: "t1",  wrapper_id: "w1", transaction_type: "BUY",        trade_date: "2026-05-20", asset_name: "iShares Core MSCI World ETF",       isin: "IE00B4L5Y983", units: 500,     price: 97.82, net_amount:  48_910,  fees: 25,    notes: "",                                             is_book_over: false },
  { id: "t6",  wrapper_id: "w1", transaction_type: "FEE",        trade_date: "2026-04-01", asset_name: "Platform fee Q1 2026",                isin: null,           units: null,    price: null,  net_amount:  -1_180,  fees: 1_180, notes: "",                                             is_book_over: false },
  { id: "t7",  wrapper_id: "w1", transaction_type: "CASH_IN",    trade_date: "2026-03-31", asset_name: "SIPP contribution",                   isin: null,           units: null,    price: null,  net_amount:  40_000,  fees:  0,    notes: "",                                             is_book_over: false },
  { id: "t8",  wrapper_id: "w1", transaction_type: "TAX_RELIEF", trade_date: "2026-03-31", asset_name: "HMRC basic rate tax relief",           isin: null,           units: null,    price: null,  net_amount:  10_000,  fees:  0,    notes: "20% basic rate relief on £40,000 contribution", is_book_over: false },
  { id: "t9",  wrapper_id: "w1", transaction_type: "BUY",        trade_date: "2026-03-15", asset_name: "Baillie Gifford American B Acc",      isin: "GB0006063233", units: 2_000,  price: 10.10, net_amount:  20_200,  fees: 15,    notes: "",                                             is_book_over: false },
  { id: "t11", wrapper_id: "w1", transaction_type: "WITHDRAWAL", trade_date: "2026-01-20", asset_name: "Income drawdown",                     isin: null,           units: null,    price: null,  net_amount:  -5_000,  fees:  0,    notes: "Regular income drawdown",                      is_book_over: false },

  // ── ISA (w2) ───────────────────────────────────────────────────────────────
  { id: "t2",  wrapper_id: "w2", transaction_type: "DIVIDEND",      trade_date: "2026-05-15", asset_name: "Fidelity Global Dividend",          isin: "GB00B7778087", units: null,   price: null,  net_amount:   1_240,  fees:  0,    notes: "",                                    is_book_over: false },
  { id: "t4",  wrapper_id: "w2", transaction_type: "IN_SPECIE_IN",  trade_date: "2026-04-22", asset_name: "Vanguard S&P 500 ETF (Acc)",        isin: "IE00BFMXXD54", units: 4_000, price: 95.50, net_amount: 382_000,  fees:  0,    notes: "In-specie transfer in — book-over",    is_book_over: true  },
  { id: "t10", wrapper_id: "w2", transaction_type: "DIVIDEND",      trade_date: "2026-02-15", asset_name: "Legal & General Global 100 Index",  isin: "GB00B0CNH708", units: null,   price: null,  net_amount:     890,  fees:  0,    notes: "",                                    is_book_over: false },
  { id: "t15", wrapper_id: "w2", transaction_type: "BUY",           trade_date: "2026-01-10", asset_name: "Vanguard LifeStrategy 80% Equity",  isin: "GB00B4PQW151", units: 8_000, price: 24.10, net_amount: 192_800,  fees: 20,    notes: "Annual ISA subscription 2025/26",      is_book_over: false },
  { id: "t16", wrapper_id: "w2", transaction_type: "CASH_IN",       trade_date: "2025-04-06", asset_name: "ISA subscription 2025/26",          isin: null,           units: null,   price: null,  net_amount:  20_000,  fees:  0,    notes: "Full annual ISA allowance",           is_book_over: false },

  // ── GIA (w3) ───────────────────────────────────────────────────────────────
  { id: "t3",  wrapper_id: "w3", transaction_type: "SELL",      trade_date: "2026-05-10", asset_name: "Artemis UK Select",                     isin: "GB00B2PDCS86", units: 10_000, price: 3.08,  net_amount:  30_775,  fees: 25,    notes: "",                                             is_book_over: false },
  { id: "t5",  wrapper_id: "w3", transaction_type: "IN_SPECIE_OUT", trade_date: "2026-04-22", asset_name: "Vanguard S&P 500 ETF (Acc)",        isin: "IE00BFMXXD54", units: 4_000, price: 95.50, net_amount: -382_000, fees:  0,    notes: "In-specie transfer out — book-over",            is_book_over: true  },
  { id: "t12", wrapper_id: "w3", transaction_type: "INTEREST",  trade_date: "2026-01-15", asset_name: "Cash account interest",                 isin: null,           units: null,   price: null,  net_amount:     312,  fees:  0,    notes: "",                                             is_book_over: false },
  { id: "t13", wrapper_id: "w3", transaction_type: "CASH_OUT",  trade_date: "2025-12-20", asset_name: "Ad-hoc withdrawal",                     isin: null,           units: null,   price: null,  net_amount:  -8_500,  fees:  0,    notes: "",                                             is_book_over: false },
  { id: "t17", wrapper_id: "w3", transaction_type: "BUY",       trade_date: "2025-11-05", asset_name: "Rathbone Ethical Bond Fund",             isin: "GB0001444814", units: 20_000, price: 2.78,  net_amount:  55_600,  fees: 20,    notes: "",                                             is_book_over: false },

  // ── Offshore Bond (w4) ─────────────────────────────────────────────────────
  { id: "t18", wrapper_id: "w4", transaction_type: "CASH_IN",   trade_date: "2026-03-01", asset_name: "Bond premium top-up",                   isin: null,           units: null,   price: null,  net_amount:  20_000,  fees:  0,    notes: "Additional premium RL360",                     is_book_over: false },
  { id: "t19", wrapper_id: "w4", transaction_type: "BUY",       trade_date: "2026-03-02", asset_name: "BlackRock Global Allocation Fund",       isin: "LU0171289902", units: 1_500, price: 12.40, net_amount:  18_600,  fees: 10,    notes: "",                                             is_book_over: false },
  { id: "t20", wrapper_id: "w4", transaction_type: "WITHDRAWAL", trade_date: "2026-02-01", asset_name: "5% annual allowance withdrawal",        isin: null,           units: null,   price: null,  net_amount:  -7_250,  fees:  0,    notes: "Within cumulative 5% allowance — no chargeable event", is_book_over: false },
  { id: "t21", wrapper_id: "w4", transaction_type: "DIVIDEND",  trade_date: "2025-12-15", asset_name: "Invesco Corporate Bond",                 isin: "GB00B1XFGM25", units: null,   price: null,  net_amount:     480,  fees:  0,    notes: "",                                             is_book_over: false },
];

// ── Mutable in-memory store ───────────────────────────────────────────────────

const STORE: Record<string, TransactionRow[]> = {
  c1: C1_TRANSACTIONS,
};

function getStore(clientId: string): TransactionRow[] {
  if (!STORE[clientId]) {
    // Generate generic data for any other client
    STORE[clientId] = [
      { id: `${clientId}-t1`, wrapper_id: `w-${clientId}-sipp`, transaction_type: "CASH_IN",  trade_date: "2026-03-31", asset_name: "SIPP contribution",       isin: null,           units: null,  price: null,  net_amount: 40_000, fees: 0,  notes: "", is_book_over: false },
      { id: `${clientId}-t2`, wrapper_id: `w-${clientId}-sipp`, transaction_type: "TAX_RELIEF",trade_date: "2026-03-31", asset_name: "HMRC basic rate tax relief",isin: null,           units: null,  price: null,  net_amount: 10_000, fees: 0,  notes: "", is_book_over: false },
      { id: `${clientId}-t3`, wrapper_id: `w-${clientId}-sipp`, transaction_type: "BUY",       trade_date: "2026-03-15", asset_name: "iShares Core MSCI World",   isin: "IE00B4L5Y983", units: 400,   price: 97.82, net_amount: 39_128, fees: 20, notes: "", is_book_over: false },
      { id: `${clientId}-t4`, wrapper_id: `w-${clientId}-isa`,  transaction_type: "CASH_IN",   trade_date: "2026-04-06", asset_name: "ISA subscription 2025/26",  isin: null,           units: null,  price: null,  net_amount: 20_000, fees: 0,  notes: "Full ISA allowance", is_book_over: false },
      { id: `${clientId}-t5`, wrapper_id: `w-${clientId}-isa`,  transaction_type: "DIVIDEND",  trade_date: "2026-05-01", asset_name: "Fidelity Global Dividend",  isin: "GB00B7778087", units: null,  price: null,  net_amount:    520, fees: 0,  notes: "", is_book_over: false },
    ];
  }
  return STORE[clientId];
}

function setStore(clientId: string, rows: TransactionRow[]) {
  STORE[clientId] = rows;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTransactions(
  clientId:  string,
  page:      number,
  pageSize:  number,
  wrapperId?: string,   // undefined = all accounts
) {
  return useQuery({
    queryKey:  ["transactions", clientId, page, pageSize, wrapperId ?? "all"],
    queryFn:   async () => {
      const all      = getStore(clientId);
      const filtered = wrapperId ? all.filter((t) => t.wrapper_id === wrapperId) : all;
      // Sort newest first
      const sorted   = [...filtered].sort((a, b) => b.trade_date.localeCompare(a.trade_date));
      const start    = page * pageSize;
      return { transactions: sorted.slice(start, start + pageSize), total: sorted.length };
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
        wrapper_id:       input.wrapper_id,
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
      setStore(clientId, [newRow, ...getStore(clientId)]);
      return newRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", clientId] }),
  });
}

// ── Update mutation ───────────────────────────────────────────────────────────

export function useUpdateTransaction(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
      const rows = getStore(clientId).map((r) =>
        r.id !== id ? r : {
          ...r,
          wrapper_id:       input.wrapper_id,
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
