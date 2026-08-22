import { useEffect, useState } from "react";
import type { BillCharges, Currency, DiscountTiming, DiscountType } from "../types";
import {
  calculatePercentage,
  formatChargePercentageIndicator,
} from "../utils/calculations";
import { minorToInput, parseMoneyInput } from "../utils/currency";

function ChoiceRow<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: Array<{ value: T; text: string }>;
  onChange: (value: T) => void;
}) {
  const labelId = `${name}-label`;

  return (
    <div className="field">
      <span id={labelId} className="field-label">
        {label}
      </span>
      <div className="choice-row" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => (
          <label key={option.value} className={`choice${value === option.value ? " is-selected" : ""}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice-face">
              <span className="choice-dot" aria-hidden="true" />
              {option.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ChargesForm({
  currency,
  charges,
  subtotal,
  onChange,
}: {
  currency: Currency;
  charges: BillCharges;
  subtotal: number;
  onChange: (next: BillCharges) => void;
}) {
  const isPercent = charges.discountType === "PERCENTAGE";
  const [discountInput, setDiscountInput] = useState(
    isPercent ? String(charges.discount / 100) : minorToInput(charges.discount, currency.decimalPlaces)
  );
  const [serviceInput, setServiceInput] = useState(
    minorToInput(charges.service, currency.decimalPlaces)
  );
  const [taxInput, setTaxInput] = useState(minorToInput(charges.tax, currency.decimalPlaces));

  const taxPercentage = (() => {
    const parsed = parseMoneyInput(taxInput, currency.decimalPlaces, { allowZero: true });
    if (parsed === null) return null;
    return calculatePercentage(parsed, subtotal);
  })();

  const servicePercentage = (() => {
    const parsed = parseMoneyInput(serviceInput, currency.decimalPlaces, { allowZero: true });
    if (parsed === null) return null;
    return calculatePercentage(parsed, subtotal);
  })();

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
      <div className="fields-split fields-split-stack">
        <div className="field">
          <label htmlFor="tax">Tax</label>
          <div className="input-shell charge-field-shell">
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
            <span className="charge-percent" aria-live="polite">
              {formatChargePercentageIndicator(taxPercentage)}
            </span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="service">Service charge</label>
          <div className="input-shell charge-field-shell">
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
            <span className="charge-percent" aria-live="polite">
              {formatChargePercentageIndicator(servicePercentage)}
            </span>
          </div>
        </div>
      </div>

      <ChoiceRow
        label="Discount type"
        name="discountType"
        value={charges.discountType}
        options={[
          { value: "PERCENTAGE", text: "Percentage" },
          { value: "FIXED", text: "Fixed" },
        ]}
        onChange={(discountType: DiscountType) => {
          onChange({ ...charges, discountType, discount: 0 });
          setDiscountInput(discountType === "PERCENTAGE" ? "0" : minorToInput(0, currency.decimalPlaces));
        }}
      />

      <ChoiceRow
        label="Discount timing"
        name="discountTiming"
        value={charges.discountTiming}
        options={[
          { value: "BEFORE_CHARGES", text: "Before tax & service" },
          { value: "AFTER_CHARGES", text: "After tax & service" },
        ]}
        onChange={(discountTiming: DiscountTiming) => onChange({ ...charges, discountTiming })}
      />

      <div className="field">
        <label htmlFor="discount">{isPercent ? "Discount" : "Discount amount"}</label>
        <div className={isPercent ? "input-shell" : undefined}>
          <input
            id="discount"
            className="input"
            inputMode="decimal"
            value={discountInput}
            onChange={(e) => {
              const raw = e.target.value;
              setDiscountInput(raw);
              if (isPercent) {
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
            placeholder={isPercent ? "10" : currency.decimalPlaces === 0 ? "50000" : "5.00"}
          />
          {isPercent ? <span className="input-addon">%</span> : null}
        </div>
      </div>
    </div>
  );
}
