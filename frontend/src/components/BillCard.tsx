import type { ReactNode } from "react";
import type { BillListItem } from "../types";
import { formatDate, formatMoney } from "../utils/currency";

export function BillCard({ bill, children }: { bill: BillListItem; children: ReactNode }) {
  const showOwner = !bill.isOwner && Boolean(bill.ownerUsername);

  return (
    <section className="card bill-card">
      <div className="bill-card-info">
        <div className="bill-card-heading">
          <h3 className="bill-card-title">{bill.title}</h3>
          {showOwner ? <span className="bill-card-owner">by @{bill.ownerUsername}</span> : null}
        </div>
        <div className="bill-card-meta">
          <strong className="bill-card-total">{formatMoney(bill.totals.total, bill.currency)}</strong>
          <span className="bill-card-date">{formatDate(bill.createdAt)}</span>
        </div>
      </div>
      <div className="bill-card-actions actions">{children}</div>
    </section>
  );
}
