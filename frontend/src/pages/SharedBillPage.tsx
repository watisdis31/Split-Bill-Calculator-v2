import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout, Button } from "../components/Layout";
import { ItemList } from "../components/ItemList";
import { BillSummary } from "../components/BillSummary";
import { PersonalCalculator } from "../components/PersonalCalculator";
import { AlertMessage, useToast } from "../components/Feedback";
import { Loading } from "../components/Loading";
import { api } from "../services/api";
import { getErrorMessage, useAuth } from "../hooks/useAuth";
import type { Bill, SharedBillAccess } from "../types";
import { ApiError } from "../types";

export function SharedBillPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bill, setBill] = useState<Bill | null>(null);
  const [access, setAccess] = useState<SharedBillAccess>({ isOwner: false, isSaved: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (!shareToken) {
          setError("Invalid share link.");
          return;
        }
        const res = await api.getSharedBill(shareToken);
        if (!cancelled) {
          setBill(res.data.bill);
          setAccess(res.data.access || { isOwner: false, isSaved: false });
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
            setError("Invalid share link.");
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
  }, [shareToken, user?.id]);

  async function saveBill() {
    if (!shareToken) return;
    if (!user) {
      navigate(`/login?redirect=/bill/s/${encodeURIComponent(shareToken)}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.saveSharedBill(shareToken);
      setAccess(res.data.access);
      notify("success", "Bill saved to your account.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate(`/login?redirect=/bill/s/${encodeURIComponent(shareToken)}`);
        return;
      }
      setError(getErrorMessage(err, "Could not save bill."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout guest>
        <Loading message="Loading bill..." />
      </Layout>
    );
  }

  if (!bill) {
    const invalidLink = error === "Invalid share link.";
    return (
      <Layout guest>
        <section className="card stack">
          <h1 className="page-title">{invalidLink ? "Invalid share link" : "Could not load bill"}</h1>
          <AlertMessage type="error" message={error || "This link may be invalid or the bill may have been deleted."} />
        </section>
      </Layout>
    );
  }

  return (
    <Layout guest>
      <h1 className="page-title">{bill.title}</h1>
      {bill.restaurantName ? <p className="bill-restaurant">{bill.restaurantName}</p> : null}
      <p className="muted">{bill.currency.code}</p>

      <div className="actions" style={{ marginBottom: "1rem" }}>
        {access.isOwner ? (
          <Button className="btn-secondary" disabled>
            Your bill
          </Button>
        ) : access.isSaved ? (
          <Button className="btn-secondary" disabled>
            Saved
          </Button>
        ) : (
          <Button loading={saving} loadingLabel="Saving..." onClick={() => void saveBill()}>
            Save bill
          </Button>
        )}
      </div>
      <AlertMessage type="error" message={error} />

      <section className="card">
        <h2>Bill summary</h2>
        <BillSummary items={bill.items} charges={bill.charges} currency={bill.currency} />
      </section>

      <section className="card">
        <h2>All orders</h2>
        <ItemList
          items={bill.items.map((item) => ({ ...item, key: String(item.id) }))}
          currency={bill.currency}
        />
      </section>

      <PersonalCalculator items={bill.items} charges={bill.charges} currency={bill.currency} />
    </Layout>
  );
}
