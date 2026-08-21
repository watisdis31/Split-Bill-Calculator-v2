import { Link } from "react-router-dom";

export function OpenBillButton({ billId }: { billId: number }) {
  return (
    <Link className="btn open-bill" to={`/bills/${billId}`}>
      Open
    </Link>
  );
}
