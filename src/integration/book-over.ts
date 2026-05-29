/**
 * Platform Book-Over (Transfer-in-Specie) accounting logic.
 *
 * A "book-over" moves assets from Platform A to Platform B without realising them.
 * It preserves the original cost basis for CGT purposes and must not appear as an
 * external cash flow in IRR or TWR calculations.
 *
 * === Atomic sequence (executed inside a Supabase Edge Function / DB transaction) ===
 *
 * 1. Read source Holding.avg_cost_basis and Holding.units
 *
 * 2. INSERT INTO platform_transfers:
 *      { from_platform, to_platform, transfer_date,
 *        original_cost_basis = <source avg_cost_basis>,
 *        is_complete = false }
 *
 * 3. INSERT INTO transactions (source sub-account):
 *      { transaction_type = 'TRANSFER_OUT_SPECIE',
 *        is_book_over = true,
 *        platform_transfer_id = <new transfer id>,
 *        units = <transferred units>,
 *        net_amount = <market value at transfer date>,
 *        gross_amount = <market value at transfer date> }
 *
 * 4. INSERT INTO transactions (destination sub-account):
 *      { transaction_type = 'TRANSFER_IN_SPECIE',
 *        is_book_over = true,
 *        platform_transfer_id = <same transfer id>,
 *        units = <transferred units>,
 *        net_amount = <market value at transfer date>,
 *        gross_amount = <market value at transfer date> }
 *
 * 5. UPSERT destination Holding:
 *      avg_cost_basis = <original_cost_basis from step 1>   ← NOT the market price
 *      units += <transferred units>
 *
 * 6. Deduct units from source Holding (or delete if units = 0)
 *
 * 7. UPDATE platform_transfers SET is_complete = true
 *
 * === Performance impact ===
 *
 * - XIRR:  Both TRANSFER_IN_SPECIE and TRANSFER_OUT_SPECIE rows have is_book_over = true.
 *          The XIRR engine filters `WHERE is_book_over = false` before building the CF series.
 *          No spurious cash flow event is created.
 *
 * - TWR:   A sub-period break is inserted at the transfer date. The end-value of the
 *          source sub-period and the begin-value of the destination sub-period are both
 *          the market value at transfer — the HPR numerator (EV - BV - CF) sees CF = 0,
 *          so performance is correctly chain-linked with no dilution.
 *
 * - CAGR:  initialValue for the destination holding uses original_cost_basis from
 *          platform_transfers, not the day's market price.  This preserves the correct
 *          annualised return from original inception.
 */

export interface BookOverInput {
  fromSubAccountId:    string;
  toSubAccountId:      string;
  assetId:             string;
  units:               number;
  marketValueAtDate:   number;
  transferDate:        string;       // ISO "YYYY-MM-DD"
  fromPlatform:        string;
  toPlatform:          string;
  originalCostBasis:   number;       // per-unit cost from source holding
  firmId:              string;
}

// This interface describes the DB rows the Edge Function will insert.
export interface BookOverResult {
  platformTransferId:    string;
  outTransactionId:      string;
  inTransactionId:       string;
}
