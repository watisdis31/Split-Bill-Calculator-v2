import type { BillCharges, Currency } from "../types";
import {
  calculateBillTotals,
  calculatePercentage,
  formatSummaryChargePercentage,
} from "../utils/calculations";
import { formatMoney } from "../utils/currency";

export function BillSummary({
  items,
  charges,
  currency,
}: {
  items: Array<{ price: number; quantity: number }>;
  charges: BillCharges;
  currency: Currency;
}) {
  const totals = calculateBillTotals(items, charges);
  const serviceLabel = formatSummaryChargePercentage(
    calculatePercentage(totals.service, totals.subtotal)
  );
  const taxLabel = formatSummaryChargePercentage(calculatePercentage(totals.tax, totals.subtotal));

  return (
    <div>
      <div className="total-line">
        <span>Items</span>
        <span>{formatMoney(totals.subtotal, currency)}</span>
      </div>
      <div className="total-line">
        <span>Discount</span>
        <span>-{formatMoney(totals.discountAmount, currency)}</span>
      </div>
      <div className="total-line">
        <span>{serviceLabel ? `Service (${serviceLabel})` : "Service"}</span>
        <span>{formatMoney(totals.service, currency)}</span>
      </div>
      <div className="total-line">
        <span>{taxLabel ? `Tax (${taxLabel})` : "Tax"}</span>
        <span>{formatMoney(totals.tax, currency)}</span>
      </div>
      <div className="you-pay">
        <div className="you-pay-label">Bill total</div>
        <div className="you-pay-amount">{formatMoney(totals.total, currency)}</div>
      </div>
    </div>
  );
}
