import { useState } from "react";
import type { Currency } from "../types";
import { formatMoney } from "../utils/currency";
import { itemTotal } from "../utils/calculations";
import { ConfirmDialog } from "./Layout";

export interface DraftItem {
  key: string;
  id?: number;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
}

export function ItemList({
  items,
  currency,
  editable = false,
  onEdit,
  onDelete,
}: {
  items: DraftItem[];
  currency: Currency;
  editable?: boolean;
  onEdit?: (item: DraftItem) => void;
  onDelete?: (item: DraftItem) => void;
}) {
  const [pending, setPending] = useState<DraftItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="empty muted">
        <p>No items yet.</p>
        <p>Add the first item from your receipt.</p>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + itemTotal(item), 0);

  return (
    <div>
      {items.map((item) => (
        <div className="item" key={item.key}>
          <div className="row-spread">
            <div>
              <div className="item-name">{item.name}</div>
              <div className="item-meta">
                {formatMoney(item.price, currency)} × {item.quantity}
              </div>
              {item.notes ? <div className="item-meta">{item.notes}</div> : null}
            </div>
            <strong>{formatMoney(itemTotal(item), currency)}</strong>
          </div>
          {editable ? (
            <div className="actions" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => onEdit?.(item)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setPending(item)}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      ))}
      <div className="total-line">
        <span>Subtotal</span>
        <span>{formatMoney(subtotal, currency)}</span>
      </div>
      {pending ? (
        <ConfirmDialog
          title="Delete this item?"
          message="Remove this item from the bill?"
          confirmLabel="Delete"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onDelete?.(pending);
            setPending(null);
          }}
        />
      ) : null}
    </div>
  );
}
