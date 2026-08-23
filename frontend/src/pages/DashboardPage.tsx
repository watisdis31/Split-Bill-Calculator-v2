import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout, Button, ConfirmDialog } from "../components/Layout";
import { OpenBillButton } from "../components/OpenBillButton";
import { BillSection } from "../components/BillSection";
import { AccountPrompt, useToast } from "../components/Feedback";
import { api } from "../services/api";
import { getErrorMessage, useAuth } from "../hooks/useAuth";
import type { BillListItem } from "../types";

export function DashboardPage() {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState<BillListItem | null>(null);
  const [removing, setRemoving] = useState<BillListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [ownedTick, setOwnedTick] = useState(0);
  const [savedTick, setSavedTick] = useState(0);
  const { notify } = useToast();

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteBill(deleting.id);
      setDeleting(null);
      notify("success", "Bill deleted successfully.");
      setOwnedTick((tick) => tick + 1);
    } catch (err) {
      setDeleting(null);
      notify("error", getErrorMessage(err, "Could not delete bill."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api.unsaveBill(removing.id);
      setRemoving(null);
      notify("success", "Bill removed from saved bills.");
      setSavedTick((tick) => tick + 1);
    } catch (err) {
      setRemoving(null);
      notify("error", getErrorMessage(err, "Could not remove saved bill."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      {!user ? (
        <>
          <div className="bill-section-header">
            <h2 className="page-title bill-section-title">My bills</h2>
            <Link className="btn" to="/bills/new">
              + Create bill
            </Link>
          </div>
          <AccountPrompt
            title="Create an account or login"
            message="Please create an account or login to see bill history or shared bills."
          />
        </>
      ) : (
        <>
      <BillSection
        title="My bills"
        scope="owned"
        searchPlaceholder="Search by title or restaurant..."
        emptyTitle="You don't have any bills yet"
        emptyCopy="Create your first bill to start splitting expenses."
        emptyAction={
          <Link className="btn" to="/bills/new">
            Create bill
          </Link>
        }
        headerAction={
          <Link className="btn" to="/bills/new">
            + Create bill
          </Link>
        }
        reloadToken={ownedTick}
        renderActions={(bill) => (
          <>
            <OpenBillButton billId={bill.id} />
            <Link className="btn btn-secondary" to={`/bills/${bill.id}/edit`}>
              Edit
            </Link>
            <Button className="btn-danger" onClick={() => setDeleting(bill)}>
              Delete
            </Button>
          </>
        )}
      />

      <BillSection
        title="Saved / shared bills"
        scope="saved"
        searchPlaceholder="Search by title or restaurant..."
        emptyTitle="No saved bills yet"
        emptyCopy="Open a shared link and click Save bill to keep it here."
        reloadToken={savedTick}
        renderActions={(bill) => (
          <>
            <OpenBillButton billId={bill.id} />
            <Button className="btn-secondary" onClick={() => setRemoving(bill)}>
              Remove from saved bills
            </Button>
          </>
        )}
      />

      {deleting ? (
        <ConfirmDialog
          title="Delete this bill?"
          message="Are you sure you want to delete this bill?"
          warning="This action cannot be undone."
          loading={busy}
          loadingLabel="Deleting..."
          onCancel={() => setDeleting(null)}
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
          onCancel={() => setRemoving(null)}
          onConfirm={() => void confirmRemove()}
        />
      ) : null}
        </>
      )}
    </Layout>
  );
}
