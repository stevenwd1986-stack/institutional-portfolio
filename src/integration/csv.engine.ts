import Papa from "papaparse";
import type { UnifiedTransaction, TxTypeStr } from "./types";

export interface CSVColumnMap {
  date:             string;
  transaction_type: string;
  asset_name:       string;
  isin:             string;
  units:            string;
  price:            string;
  currency:         string;
  fees:             string;
  net_amount?:      string; // optional — derived from units * price - fees if absent
}

export interface CSVParseResult {
  rows:   UnifiedTransaction[];
  errors: { row: number; message: string }[];
}

const COMMON_TX_ALIASES: Record<string, TxTypeStr> = {
  "BUY":          "BUY",  "PURCHASE": "BUY",  "B":    "BUY",
  "SELL":         "SELL", "SALE":     "SELL",  "S":    "SELL",
  "DIV":          "DIVIDEND", "DIVIDEND": "DIVIDEND",
  "INT":          "INTEREST", "INTEREST": "INTEREST",
  "FEE":          "FEE",  "CHARGE":   "FEE",  "CHG":  "FEE",
  "TAX":          "TAX",
  "TRANSFER IN":  "TRANSFER_IN_CASH",  "TFR IN":  "TRANSFER_IN_CASH",
  "TRANSFER OUT": "TRANSFER_OUT_CASH", "TFR OUT": "TRANSFER_OUT_CASH",
  "CONTRIB":      "CONTRIBUTION", "CONTRIBUTION": "CONTRIBUTION",
  "WITHDRAWAL":   "WITHDRAWAL",   "WITHDRAW":      "WITHDRAWAL",
};

function canonicaliseType(raw: string): TxTypeStr {
  const upper = raw.trim().toUpperCase().replace(/_/g, " ");
  return COMMON_TX_ALIASES[upper] ?? (raw.trim().toUpperCase() as TxTypeStr);
}

export function parseCSV(csvText: string, columnMap: CSVColumnMap): CSVParseResult {
  const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parseErrors.length > 0) {
    return {
      rows: [],
      errors: parseErrors.map((e) => ({ row: e.row ?? 0, message: e.message })),
    };
  }

  const rows: UnifiedTransaction[] = [];
  const errors: { row: number; message: string }[] = [];

  (data as Record<string, string>[]).forEach((raw, i) => {
    const rowNum = i + 2; // 1-based + header row
    try {
      const tradeDateRaw = raw[columnMap.date]?.trim();
      if (!tradeDateRaw) throw new Error("Missing date");

      // Support DD/MM/YYYY, MM/DD/YYYY, and ISO YYYY-MM-DD
      let tradeDate: string;
      if (/^\d{4}-\d{2}-\d{2}$/.test(tradeDateRaw)) {
        tradeDate = tradeDateRaw;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(tradeDateRaw)) {
        const [day, month, year] = tradeDateRaw.split("/");
        tradeDate = `${year}-${month}-${day}`;
      } else {
        const parsed = new Date(tradeDateRaw);
        if (isNaN(parsed.getTime())) throw new Error(`Unparseable date: "${tradeDateRaw}"`);
        tradeDate = parsed.toISOString().slice(0, 10);
      }

      const units    = raw[columnMap.units]    ? parseFloat(raw[columnMap.units])    : null;
      const price    = raw[columnMap.price]    ? parseFloat(raw[columnMap.price])    : null;
      const fees     = parseFloat(raw[columnMap.fees]     ?? "0") || 0;
      const currency = raw[columnMap.currency]?.trim() || "GBP";

      const gross = units != null && price != null ? units * price : 0;
      const net = columnMap.net_amount && raw[columnMap.net_amount]
        ? parseFloat(raw[columnMap.net_amount])
        : gross - fees;

      rows.push({
        externalRef:     `csv-row-${i}`,
        isin:            raw[columnMap.isin]?.trim() || null,
        name:            raw[columnMap.asset_name]?.trim() ?? "Unknown",
        transactionType: canonicaliseType(raw[columnMap.transaction_type] ?? "BUY"),
        tradeDate,
        settlementDate:  null,
        units, price,
        grossAmount: gross,
        netAmount:   net,
        fees, currency,
        platform:    "CSV",
        accountRef:  "csv-import",
        isBookOver:  false,
      });
    } catch (e: unknown) {
      errors.push({ row: rowNum, message: (e as Error).message });
    }
  });

  return { rows, errors };
}
