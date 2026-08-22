import { useState } from "react";
import type { BillCharges, BillItem, Currency } from "../types";
import {
  calculatePercentage,
  calculatePersonalShare,
  formatSummaryChargePercentage,
  getDiscountPercentageForDisplay,
} from "../utils/calculations";
import { formatMoney } from "../utils/currency";
import { PersonalItemSelector } from "./PersonalItemSelector";
import { Button } from "./Layout";

export function PersonalCalculator({
  items,
  charges,
  currency,
}: {
  items: BillItem[];
  charges: BillCharges;
  currency: Currency;
}) {
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [result, setResult] = useState<ReturnType<typeof calculatePersonalShare> | null>(null);

  const live = calculatePersonalShare(items, charges, selections);

  const serviceLabel = result
    ? formatSummaryChargePercentage(calculatePercentage(charges.service, result.billSubtotal))
    : null;
  const taxLabel = result
    ? formatSummaryChargePercentage(calculatePercentage(charges.tax, result.billSubtotal))
    : null;
  const discountLabel = result
    ? formatSummaryChargePercentage(
        getDiscountPercentageForDisplay(charges, result.billSubtotal, result.discountAmount)
      )
    : null;

  function calculate() {
    setResult(calculatePersonalShare(items, charges, selections));
  }

  return (
    <>
      <section className="card">
        <h2>Your order</h2>
        <PersonalItemSelector
          items={items}
          currency={currency}
          selections={selections}
          onChange={(next) => {
            setSelections(next);
            setResult(null);
          }}
        />
        <div className="total-line">
          <span>Personal subtotal</span>
          <span>{formatMoney(live.personalSubtotal, currency)}</span>
        </div>
      </section>

      <Button className="btn-block" onClick={calculate} style={{ marginBottom: "1rem" }}>
        Calculate
      </Button>

      {result ? (
        <section className="card">
          <h2>Your bill</h2>
          <div className="total-line">
            <span>Items</span>
            <span>{formatMoney(result.personalSubtotal, currency)}</span>
          </div>
          <div className="total-line">
            <span>{discountLabel ? `Discount (${discountLabel})` : "Discount"}</span>
            <span>-{formatMoney(result.personalDiscount, currency)}</span>
          </div>
          <div className="total-line">
            <span>{serviceLabel ? `Service (${serviceLabel})` : "Service"}</span>
            <span>{formatMoney(result.personalService, currency)}</span>
          </div>
          <div className="total-line">
            <span>{taxLabel ? `Tax (${taxLabel})` : "Tax"}</span>
            <span>{formatMoney(result.personalTax, currency)}</span>
          </div>
          <div className="you-pay">
            <div className="you-pay-label">You pay</div>
            <div className="you-pay-amount">{formatMoney(result.finalAmount, currency)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
