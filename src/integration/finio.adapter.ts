import type { UnifiedHolding, UnifiedTransaction, WrapperTypeStr, TxTypeStr } from "./types";

// Finio API response shapes
interface FinioPosition {
  accountId:        string;
  accountType:      string;
  isin:             string;
  sedol?:           string;
  instrumentName:   string;
  quantity:         number;
  unitPrice:        number;
  marketValue:      number;
  bookCost:         number;
  currency:         string;
  assetType:        string;
}

interface FinioTransaction {
  transactionId:   string;
  accountId:       string;
  isin?:           string;
  instrumentName?: string;
  type:            string;      // Finio's own type codes
  transactionDate: string;      // ISO "YYYY-MM-DD"
  settlementDate?: string;
  quantity?:       number;
  unitPrice?:      number;
  grossAmount:     number;
  netAmount:       number;
  charges:         number;
  currency:        string;
  inSpecie:        boolean;
}

const FINIO_TX_MAP: Record<string, TxTypeStr> = {
  "BUY":                  "BUY",
  "SELL":                 "SELL",
  "DIV":                  "DIVIDEND",
  "INT":                  "INTEREST",
  "CHG":                  "FEE",
  "TAX":                  "TAX",
  "TRF_IN_SPECIE":        "TRANSFER_IN_SPECIE",
  "TRF_OUT_SPECIE":       "TRANSFER_OUT_SPECIE",
  "TRF_IN_CASH":          "TRANSFER_IN_CASH",
  "TRF_OUT_CASH":         "TRANSFER_OUT_CASH",
  "CORP_SPLIT":           "CORPORATE_ACTION_SPLIT",
  "CORP_MERGE":           "CORPORATE_ACTION_MERGE",
  "CONTRIB":              "CONTRIBUTION",
  "WITHDRAW":             "WITHDRAWAL",
  "BENEFIT_CRYST":        "BENEFIT_CRYSTALLISATION",
};

const FINIO_WRAPPER_MAP: Record<string, WrapperTypeStr> = {
  "SIPP": "SIPP", "ISA": "ISA", "GIA": "GIA",
  "BOND": "OFFSHORE_BOND", "LISA": "LISA", "JISA": "JISA",
};

export const FinioAdapter = {
  mapHolding(pos: FinioPosition): UnifiedHolding {
    return {
      externalRef:  pos.accountId,
      isin:         pos.isin || null,
      sedol:        pos.sedol || null,
      name:         pos.instrumentName,
      units:        pos.quantity,
      price:        pos.unitPrice,
      marketValue:  pos.marketValue,
      currency:     pos.currency,
      assetClass:   pos.assetType.toUpperCase(),
      costBasis:    pos.bookCost,
      platform:     "FINIO",
      wrapperType:  (FINIO_WRAPPER_MAP[pos.accountType] ?? "GIA"),
      accountRef:   pos.accountId,
    };
  },

  mapTransaction(tx: FinioTransaction): UnifiedTransaction {
    const canonicalType = FINIO_TX_MAP[tx.type] ?? "BUY";
    const isBookOver =
      tx.inSpecie &&
      (canonicalType === "TRANSFER_IN_SPECIE" || canonicalType === "TRANSFER_OUT_SPECIE");

    return {
      externalRef:     tx.transactionId,
      isin:            tx.isin || null,
      name:            tx.instrumentName ?? "",
      transactionType: canonicalType,
      tradeDate:       tx.transactionDate,
      settlementDate:  tx.settlementDate ?? null,
      units:           tx.quantity ?? null,
      price:           tx.unitPrice ?? null,
      grossAmount:     tx.grossAmount,
      netAmount:       tx.netAmount,
      fees:            tx.charges,
      currency:        tx.currency,
      platform:        "FINIO",
      accountRef:      tx.accountId,
      isBookOver,
    };
  },
};
