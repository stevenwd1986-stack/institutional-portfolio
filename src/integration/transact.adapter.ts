import type { UnifiedHolding, UnifiedTransaction, WrapperTypeStr, TxTypeStr } from "./types";

// Transact platform API response shapes
interface TransactPosition {
  AccountReference: string;
  AccountType:      string;
  ISINCode:         string;
  SEDOLCode?:       string;
  StockDescription: string;
  Quantity:         number;
  MidPrice:         number;
  MarketValueGBP:   number;
  BookCostGBP:      number;
  AssetType:        string;
}

interface TransactTransaction {
  TransactionRef:   string;
  AccountReference: string;
  ISINCode?:        string;
  StockDescription?: string;
  TransactionType:  string;
  TransactionDate:  string;  // "DD/MM/YYYY"
  SettlementDate?:  string;
  Units?:           number;
  Price?:           number;
  GrossAmountGBP:   number;
  NetAmountGBP:     number;
  ChargesGBP:       number;
  InSpecieFlag:     boolean;
}

const TRANSACT_TX_MAP: Record<string, TxTypeStr> = {
  "Purchase":          "BUY",
  "Sale":              "SELL",
  "Dividend":          "DIVIDEND",
  "Interest":          "INTEREST",
  "Charge":            "FEE",
  "Tax Relief":        "TAX",
  "Transfer In Kind":  "TRANSFER_IN_SPECIE",
  "Transfer Out Kind": "TRANSFER_OUT_SPECIE",
  "Transfer In Cash":  "TRANSFER_IN_CASH",
  "Transfer Out Cash": "TRANSFER_OUT_CASH",
  "Stock Split":       "CORPORATE_ACTION_SPLIT",
  "Merger":            "CORPORATE_ACTION_MERGE",
  "Contribution":      "CONTRIBUTION",
  "Withdrawal":        "WITHDRAWAL",
  "Crystallisation":   "BENEFIT_CRYSTALLISATION",
};

const TRANSACT_WRAPPER_MAP: Record<string, WrapperTypeStr> = {
  "SIPP": "SIPP", "ISA": "ISA", "GIA": "GIA",
  "OB":   "OFFSHORE_BOND", "LISA": "LISA", "JISA": "JISA",
};

// Transact sends dates as DD/MM/YYYY
function parseTransactDate(d: string): string {
  const [day, month, year] = d.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export const TransactAdapter = {
  mapHolding(pos: TransactPosition): UnifiedHolding {
    return {
      externalRef:  pos.AccountReference,
      isin:         pos.ISINCode || null,
      sedol:        pos.SEDOLCode || null,
      name:         pos.StockDescription,
      units:        pos.Quantity,
      price:        pos.MidPrice,
      marketValue:  pos.MarketValueGBP,
      currency:     "GBP",
      assetClass:   pos.AssetType.toUpperCase(),
      costBasis:    pos.BookCostGBP,
      platform:     "TRANSACT",
      wrapperType:  (TRANSACT_WRAPPER_MAP[pos.AccountType] ?? "GIA"),
      accountRef:   pos.AccountReference,
    };
  },

  mapTransaction(tx: TransactTransaction): UnifiedTransaction {
    const canonicalType = TRANSACT_TX_MAP[tx.TransactionType] ?? "BUY";
    const isBookOver =
      tx.InSpecieFlag &&
      (canonicalType === "TRANSFER_IN_SPECIE" || canonicalType === "TRANSFER_OUT_SPECIE");

    return {
      externalRef:     tx.TransactionRef,
      isin:            tx.ISINCode || null,
      name:            tx.StockDescription ?? "",
      transactionType: canonicalType,
      tradeDate:       parseTransactDate(tx.TransactionDate),
      settlementDate:  tx.SettlementDate ? parseTransactDate(tx.SettlementDate) : null,
      units:           tx.Units ?? null,
      price:           tx.Price ?? null,
      grossAmount:     tx.GrossAmountGBP,
      netAmount:       tx.NetAmountGBP,
      fees:            tx.ChargesGBP,
      currency:        "GBP",
      platform:        "TRANSACT",
      accountRef:      tx.AccountReference,
      isBookOver,
    };
  },
};
