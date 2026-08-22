import type { BillItem, Currency } from "../types";
import { formatMoney } from "../utils/currency";

export function PersonalItemSelector({
  items,
  currency,
  selections,
  onChange,
}: {
  items: BillItem[];
  currency: Currency;
  selections: Record<number, number>;
  onChange: (next: Record<number, number>) => void;
}) {
  if (items.length === 0) {
    return <p className="muted">This bill has no items yet.</p>;
  }

  function setQty(id: number, qty: number, max: number) {
    const nextQty = Math.min(Math.max(qty, 0), max);
    onChange({ ...selections, [id]: nextQty });
  }

  return (
    <div>
      {items.map((item) => {
        const selected = selections[item.id] || 0;
        const checked = selected > 0;
        return (
          <div className="item" key={item.id}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setQty(item.id, e.target.checked ? Math.max(selected, 1) : 0, item.quantity)}
              />
              <span>
                <span className="item-name">{item.name}</span>
                <span className="item-meta" style={{ display: "block" }}>
                  {formatMoney(item.price, currency)} · up to {item.quantity}
                </span>
              </span>
            </label>
            <div className="qty-control">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setQty(item.id, selected - 1, item.quantity)}
                disabled={selected <= 0}
              >
                −
              </button>
              <input
                className="input"
                type="number"
                min={0}
                max={item.quantity}
                value={selected}
                onChange={(e) => setQty(item.id, Number(e.target.value) || 0, item.quantity)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setQty(item.id, selected + 1, item.quantity)}
                disabled={selected >= item.quantity}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
