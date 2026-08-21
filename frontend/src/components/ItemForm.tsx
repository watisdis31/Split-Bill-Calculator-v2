import { useState } from "react";
import type { Currency } from "../types";
import { parseMoneyInput, minorToInput } from "../utils/currency";
import { unitPriceFromMultiple } from "../utils/calculations";
import { Button } from "./Layout";
import { FieldError } from "./Feedback";

interface ItemFormValues {
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
}

export function ItemForm({
  currency,
  submitLabel = "Add",
  initial,
  onSubmit,
}: {
  currency: Currency;
  submitLabel?: string;
  initial?: { name: string; price: number; quantity: number; notes: string | null };
  onSubmit: (item: ItemFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? minorToInput(initial.price, currency.decimalPlaces) : "");
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [multiple, setMultiple] = useState(false);
  const [nameError, setNameError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [quantityError, setQuantityError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    let nextNameError = "";
    let nextPriceError = "";
    let nextQuantityError = "";

    if (!trimmed) nextNameError = "Item name is required.";

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      nextQuantityError = "Quantity must be an integer of at least 1.";
    }

    const parsedPrice = parseMoneyInput(price, currency.decimalPlaces);
    if (parsedPrice === null) {
      nextPriceError = "Price must be greater than 0.";
    } else {
      const unitPrice = multiple && qty >= 1 ? unitPriceFromMultiple(parsedPrice, qty) : parsedPrice;
      if (unitPrice <= 0) nextPriceError = "Unit price must be greater than 0.";
    }

    setNameError(nextNameError);
    setPriceError(nextPriceError);
    setQuantityError(nextQuantityError);
    if (nextNameError || nextPriceError || nextQuantityError) return;

    const unitPrice = multiple ? unitPriceFromMultiple(parsedPrice as number, qty) : (parsedPrice as number);
    onSubmit({
      name: trimmed,
      price: unitPrice,
      quantity: qty,
      notes: notes.trim() || null,
    });
    if (!initial) {
      setName("");
      setPrice("");
      setQuantity("1");
      setNotes("");
      setMultiple(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="item-name">Item name</label>
        <input
          id="item-name"
          className={`input${nameError ? " input-invalid" : ""}`}
          value={name}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "item-name-error" : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setNameError("");
          }}
          placeholder="Food / Drink Name"
        />
        <FieldError id="item-name-error" message={nameError} />
      </div>
      <div className="field">
        <label htmlFor="item-price">Price</label>
        <input
          id="item-price"
          className={`input${priceError ? " input-invalid" : ""}`}
          inputMode="decimal"
          value={price}
          aria-invalid={Boolean(priceError)}
          aria-describedby={priceError ? "item-price-error" : undefined}
          onChange={(e) => {
            setPrice(e.target.value);
            setPriceError("");
          }}
          placeholder={currency.decimalPlaces === 0 ? "50000" : "12.50"}
        />
        <FieldError id="item-price-error" message={priceError} />
      </div>
      <div className="field">
        <label htmlFor="item-qty">Quantity</label>
        <input
          id="item-qty"
          className={`input${quantityError ? " input-invalid" : ""}`}
          type="number"
          min={1}
          step={1}
          value={quantity}
          aria-invalid={Boolean(quantityError)}
          aria-describedby={quantityError ? "item-qty-error" : undefined}
          onChange={(e) => {
            setQuantity(e.target.value);
            setQuantityError("");
          }}
        />
        <FieldError id="item-qty-error" message={quantityError} />
      </div>
      <div className="field">
        <label htmlFor="item-notes">Notes (optional)</label>
        <input
          id="item-notes"
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Shared, extra spicy..."
        />
      </div>
      {!initial ? (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={multiple}
            onChange={(e) => setMultiple(e.target.checked)}
          />
          Multiple items — entered price is the line total
        </label>
      ) : null}
      <Button type="submit" className="btn-block">
        {submitLabel}
      </Button>
    </form>
  );
}
