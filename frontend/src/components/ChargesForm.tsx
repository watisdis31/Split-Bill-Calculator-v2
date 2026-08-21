import { useEffect, useState } from "react";
import type { BillCharges, Currency, DiscountTiming, DiscountType } from "../types";
import { minorToInput, parseMoneyInput } from "../utils/currency";

export function ChargesForm({
  currency,
  charges,
  onChange,
}: {
  currency: Currency;
  charges: BillCharges;
  onChange: (next: BillCharges) => void;
}) {
  const [discountInput, setDiscountInput] = useState(
    charges.discountType === "PERCENTAGE"
      ? String(charges.discount / 100)
      : minorToInput(charges.discount, currency.decimalPlaces)
  );
  const [serviceInput, setServiceInput] = useState(
    minorToInput(charges.service, currency.decimalPlaces)
  );
  const [taxInput, setTaxInput] = useState(minorToInput(charges.tax, currency.decimalPlaces));

  useEffect(() => {
    setDiscountInput(
      charges.discountType === "PERCENTAGE"
        ? String(charges.discount / 100)
        : minorToInput(charges.discount, currency.decimalPlaces)
    );
    setServiceInput(minorToInput(charges.service, currency.decimalPlaces));
    setTaxInput(minorToInput(charges.tax, currency.decimalPlaces));
  }, [currency.id, charges.discountType]);

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="discount-type">Discount type</label>
        <select
          id="discount-type"
          className="select"
          value={charges.discountType}
          onChange={(e) => {
            const discountType = e.target.value as DiscountType;
            onChange({ ...charges, discountType, discount: 0 });
            setDiscountInput(discountType === "PERCENTAGE" ? "0" : minorToInput(0, currency.decimalPlaces));
          }}
        >
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="discount">
          {charges.discountType === "PERCENTAGE" ? "Discount %" : "Discount amount"}
        </label>
        <input
          id="discount"
          className="input"
          inputMode="decimal"
          value={discountInput}
          onChange={(e) => {
            const raw = e.target.value;
            setDiscountInput(raw);
            if (charges.discountType === "PERCENTAGE") {
              if (raw === "") {
                onChange({ ...charges, discount: 0 });
                return;
              }
              const n = Number(raw);
              if (Number.isNaN(n) || n < 0 || n > 100) return;
              onChange({ ...charges, discount: Math.round(n * 100) });
              return;
            }
            const parsed = parseMoneyInput(raw, currency.decimalPlaces, { allowZero: true });
            if (parsed !== null) onChange({ ...charges, discount: parsed });
          }}
          placeholder={charges.discountType === "PERCENTAGE" ? "10" : currency.decimalPlaces === 0 ? "50000" : "5.00"}
        />
      </div>

      <div className="field">
        <label htmlFor="discount-timing">Discount timing</label>
        <select
          id="discount-timing"
          className="select"
          value={charges.discountTiming}
          onChange={(e) =>
            onChange({ ...charges, discountTiming: e.target.value as DiscountTiming })
          }
        >
          <option value="BEFORE_CHARGES">Before tax & service</option>
          <option value="AFTER_CHARGES">After tax & service</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="service">Service charge</label>
        <input
          id="service"
          className="input"
          inputMode="decimal"
          value={serviceInput}
          onChange={(e) => {
            const raw = e.target.value;
            setServiceInput(raw);
            const parsed = parseMoneyInput(raw, currency.decimalPlaces, { allowZero: true });
            if (parsed !== null) onChange({ ...charges, service: parsed });
          }}
          placeholder={currency.decimalPlaces === 0 ? "25000" : "5.00"}
        />
      </div>

      <div className="field">
        <label htmlFor="tax">Tax</label>
        <input
          id="tax"
          className="input"
          inputMode="decimal"
          value={taxInput}
          onChange={(e) => {
            const raw = e.target.value;
            setTaxInput(raw);
            const parsed = parseMoneyInput(raw, currency.decimalPlaces, { allowZero: true });
            if (parsed !== null) onChange({ ...charges, tax: parsed });
          }}
          placeholder={currency.decimalPlaces === 0 ? "52500" : "4.00"}
        />
      </div>
    </div>
  );
}
