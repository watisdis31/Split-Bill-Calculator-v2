import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout, Button, ConfirmDialog } from "../components/Layout";
import { ItemList } from "../components/ItemList";
import { BillSummary } from "../components/BillSummary";
import { PersonalCalculator } from "../components/PersonalCalculator";
import { ShareBillPanel } from "../components/ShareBillPanel";
import { AlertMessage, StatusMessage } from "../components/Feedback";
import { api } from "../services/api";
import { getErrorMessage } from "../hooks/useAuth";
import type { Bill } from "../types";
import { ApiError } from "../types";

export function BillViewPage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.getBill(Number(billId));
        if (!cancelled) setBill(res.data.bill);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setError("Bill not found.");
          } else {
            setError(getErrorMessage(err, "Could not load bill."));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [billId]);

  async function confirmDelete() {
    if (!bill) return;
    setBusy(true);
    try {
      await api.deleteBill(bill.id);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete bill."));
      setDeleting(false);
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!bill) return;
    setBusy(true);
    try {
      await api.unsaveBill(bill.id);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove saved bill."));
      setRemoving(false);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Layout narrow>
        <StatusMessage>Loading bill...</StatusMessage>
      </Layout>
    );
  }

  if (!bill) {
    return (
      <Layout narrow>
        <section className="card stack">
          <h1 className="page-title">Bill not found</h1>
          <AlertMessage type="error" message={error || "This bill may have been deleted."} />
          <Link className="btn" to="/dashboard">
            Back to dashboard
          </Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout narrow>
      <h1 className="page-title">{bill.title}</h1>
      <p className="muted">{bill.currency.code}</p>
      <AlertMessage type="error" message={error} />

      {bill.isOwner ? (
        <div className="actions" style={{ marginBottom: "1rem" }}>
          <Link className="btn" to={`/bills/${bill.id}/edit`}>
            Edit
          </Link>
          <Button className="btn-danger" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        </div>
      ) : (
        <div className="actions" style={{ marginBottom: "1rem" }}>
          <Button className="btn-secondary" onClick={() => setRemoving(true)}>
            Remove from saved bills
          </Button>
        </div>
      )}

      <section className="card">
        <h2>All orders</h2>
        <ItemList
          items={bill.items.map((item) => ({ ...item, key: String(item.id) }))}
          currency={bill.currency}
        />
      </section>

      <section className="card">
        <h2>Bill summary</h2>
        <BillSummary items={bill.items} charges={bill.charges} currency={bill.currency} />
      </section>

      <PersonalCalculator items={bill.items} charges={bill.charges} currency={bill.currency} />

      {bill.isOwner ? (
        <section className="card">
          <h2>Share bill</h2>
          <ShareBillPanel billId={bill.id} shareToken={bill.shareToken} />
        </section>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this bill?"
          message="Are you sure you want to delete this bill?"
          warning="This action cannot be undone."
          loading={busy}
          loadingLabel="Deleting..."
          onCancel={() => setDeleting(false)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="Remove saved bill?"
          message="This removes the bill from your account. The original bill is not deleted."
          confirmLabel="Remove"
          loading={busy}
          loadingLabel="Removing..."
          onCancel={() => setRemoving(false)}
          onConfirm={() => void confirmRemove()}
        />
      ) : null}
    </Layout>
  );
}
