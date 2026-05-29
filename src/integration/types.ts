export type PlatformType   = "FINIO" | "TRANSACT" | "CSV";
export type WrapperTypeStr = "SIPP" | "ISA" | "GIA" | "OFFSHORE_BOND" | "LISA" | "JISA";
export type TxTypeStr =
  | "BUY" | "SELL" | "DIVIDEND" | "INTEREST" | "FEE" | "TAX"
  | "TRANSFER_IN_SPECIE" | "TRANSFER_OUT_SPECIE"
  | "TRANSFER_IN_CASH"   | "TRANSFER_OUT_CASH"
  | "CORPORATE_ACTION_SPLIT" | "CORPORATE_ACTION_MERGE"
  | "CONTRIBUTION" | "WITHDRAWAL" | "BENEFIT_CRYSTALLISATION";

export interface UnifiedHolding {
  externalRef:  string;
  isin:         string | null;
  sedol:        string | null;
  name:         string;
  units:        number;
  price:        number;
  marketValue:  number;
  currency:     string;
  assetClass:   string;
  costBasis:    number;
  platform:     PlatformType;
  wrapperType:  WrapperTypeStr;
  accountRef:   string;
}

export interface UnifiedTransaction {
  externalRef:     string;
  isin:            string | null;
  name:            string;
  transactionType: TxTypeStr;
  tradeDate:       string;       // ISO "YYYY-MM-DD"
  settlementDate:  string | null;
  units:           number | null;
  price:           number | null;
  grossAmount:     number;
  netAmount:       number;
  fees:            number;
  currency:        string;
  platform:        PlatformType;
  accountRef:      string;
  isBookOver:      boolean;
}
