import { useEffect, useState } from "react";
import type { BillCharges, Currency, DiscountTiming, DiscountType } from "../types";
import {
  calculatePercentage,
  formatChargePercentageIndicator,
  getDiscountBase,
} from "../utils/calculations";
import { minorToEditableInput, parseMoneyInput } from "../utils/currency";

function percentDiscountToInput(basisPoints: number): string {
  if (!basisPoints) return "";
  return String(basisPoints / 100);
}

function zeroPlaceholder(decimalPlaces: number): string {
  return decimalPlaces === 0 ? "0" : `0.${"0".repeat(decimalPlaces)}`;
}

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
    isPercent
      ? percentDiscountToInput(charges.discount)
      : minorToEditableInput(charges.discount, currency.decimalPlaces)
  );
  const [serviceInput, setServiceInput] = useState(
    minorToEditableInput(charges.service, currency.decimalPlaces)
  );
  const [taxInput, setTaxInput] = useState(minorToEditableInput(charges.tax, currency.decimalPlaces));

  const parsedTax = parseMoneyInput(taxInput, currency.decimalPlaces, { allowZero: true });
  const parsedService = parseMoneyInput(serviceInput, currency.decimalPlaces, { allowZero: true });
  const parsedFixedDiscount = isPercent
    ? null
    : parseMoneyInput(discountInput, currency.decimalPlaces, { allowZero: true });

  const taxPercentage = parsedTax === null ? null : calculatePercentage(parsedTax, subtotal);
  const servicePercentage = parsedService === null ? null : calculatePercentage(parsedService, subtotal);
  const discountPercentage =
    parsedFixedDiscount === null
      ? null
      : calculatePercentage(
          parsedFixedDiscount,
          getDiscountBase(subtotal, {
            ...charges,
            tax: parsedTax ?? charges.tax,
            service: parsedService ?? charges.service,
          })
        );

  useEffect(() => {
    setDiscountInput(
      charges.discountType === "PERCENTAGE"
        ? percentDiscountToInput(charges.discount)
        : minorToEditableInput(charges.discount, currency.decimalPlaces)
    );
    setServiceInput(minorToEditableInput(charges.service, currency.decimalPlaces));
    setTaxInput(minorToEditableInput(charges.tax, currency.decimalPlaces));
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
              placeholder={zeroPlaceholder(currency.decimalPlaces)}
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
              placeholder={zeroPlaceholder(currency.decimalPlaces)}
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
          setDiscountInput("");
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
        <div className={isPercent ? "input-shell" : "input-shell charge-field-shell"}>
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
            placeholder={isPercent ? "0" : zeroPlaceholder(currency.decimalPlaces)}
          />
          {isPercent ? (
            <span className="input-addon">%</span>
          ) : (
            <span className="charge-percent" aria-live="polite">
              {formatChargePercentageIndicator(discountPercentage)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
