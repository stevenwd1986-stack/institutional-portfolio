import { useQuery } from "@tanstack/react-query";

export interface TransactionRow {
  id:               string;
  transaction_type: string;
  trade_date:       string;
  asset_name:       string;
  isin:             string | null;
  units:            number | null;
  price:            number | null;
  net_amount:       number;
  fees:             number;
  is_book_over:     boolean;
}

const DEMO_TRANSACTIONS: TransactionRow[] = [
  { id: "t1",  transaction_type: "BUY",                  trade_date: "2026-05-20", asset_name: "iShares Core MSCI World ETF",      isin: "IE00B4L5Y983", units: 500,     price: 97.82,  net_amount: 48_910,  fees: 25, is_book_over: false },
  { id: "t2",  transaction_type: "DIVIDEND",             trade_date: "2026-05-15", asset_name: "Fidelity Global Dividend",           isin: "GB00B7778087", units: null,    price: null,   net_amount:  1_240,  fees:  0, is_book_over: false },
  { id: "t3",  transaction_type: "SELL",                 trade_date: "2026-05-10", asset_name: "Artemis UK Select",                  isin: "GB00B2PDCS86", units: 10_000, price: 3.08,   net_amount: 30_775, fees:  25, is_book_over: false },
  { id: "t4",  transaction_type: "TRANSFER_IN_SPECIE",   trade_date: "2026-04-22", asset_name: "Vanguard S&P 500 ETF (Acc)",         isin: "IE00BFMXXD54", units: 4_000,  price: 95.50,  net_amount: 382_000, fees:  0, is_book_over: true  },
  { id: "t5",  transaction_type: "TRANSFER_OUT_SPECIE",  trade_date: "2026-04-22", asset_name: "Vanguard S&P 500 ETF (Acc)",         isin: "IE00BFMXXD54", units: 4_000,  price: 95.50,  net_amount: -382_000, fees: 0, is_book_over: true },
  { id: "t6",  transaction_type: "FEE",                  trade_date: "2026-04-01", asset_name: "Platform fee",                       isin: null,           units: null,    price: null,   net_amount:  -1_180, fees: 1_180, is_book_over: false },
  { id: "t7",  transaction_type: "CONTRIBUTION",         trade_date: "2026-03-31", asset_name: "SIPP contribution",                  isin: null,           units: null,    price: null,   net_amount: 40_000,  fees:  0, is_book_over: false },
  { id: "t8",  transaction_type: "BUY",                  trade_date: "2026-03-15", asset_name: "Baillie Gifford American B Acc",     isin: "GB0006063233", units: 2_000,  price: 10.10,  net_amount: 20_200,  fees: 15, is_book_over: false },
  { id: "t9",  transaction_type: "BUY",                  trade_date: "2026-02-28", asset_name: "Rathbone Ethical Bond Fund",          isin: "GB0001444814", units: 20_000, price: 2.78,   net_amount: 55_600,  fees: 20, is_book_over: false },
  { id: "t10", transaction_type: "DIVIDEND",             trade_date: "2026-02-15", asset_name: "Legal & General Global 100 Index",   isin: "GB00B0CNH708", units: null,    price: null,   net_amount:    890,  fees:  0, is_book_over: false },
];

export function useTransactions(clientId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["transactions", clientId, page, pageSize],
    queryFn: async () => {
      const start = page * pageSize;
      const slice = DEMO_TRANSACTIONS.slice(start, start + pageSize);
      return { transactions: slice, total: DEMO_TRANSACTIONS.length };
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: { transactions: DEMO_TRANSACTIONS.slice(0, pageSize), total: DEMO_TRANSACTIONS.length },
  });
}
