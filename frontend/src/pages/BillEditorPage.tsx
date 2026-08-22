import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout, Button } from "../components/Layout";
import { ItemForm } from "../components/ItemForm";
import { ItemList } from "../components/ItemList";
import type { DraftItem } from "../components/ItemList";
import { ChargesForm } from "../components/ChargesForm";
import { BillSummary } from "../components/BillSummary";
import { ShareBillPanel } from "../components/ShareBillPanel";
import { AlertMessage, FieldError, StatusMessage, useToast } from "../components/Feedback";
import { api } from "../services/api";
import { getErrorMessage } from "../hooks/useAuth";
import type { BillCharges, Currency } from "../types";

const emptyCharges: BillCharges = {
  discount: 0,
  discountType: "PERCENTAGE",
  discountTiming: "BEFORE_CHARGES",
  service: 0,
  tax: 0,
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function BillEditorPage() {
  const { billId } = useParams();
  const isNew = !billId;
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [title, setTitle] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [currencyId, setCurrencyId] = useState<number | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [charges, setCharges] = useState<BillCharges>(emptyCharges);
  const [editing, setEditing] = useState<DraftItem | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(billId ? Number(billId) : null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [restaurantError, setRestaurantError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const { notify } = useToast();

  const currency = useMemo(
    () => currencies.find((c) => c.id === currencyId) || currencies[0],
    [currencies, currencyId]
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const currencyRes = await api.currencies();
        if (cancelled) return;
        setCurrencies(currencyRes.data.currencies);
        const idr = currencyRes.data.currencies.find((c) => c.code === "IDR");
        setCurrencyId(idr?.id ?? currencyRes.data.currencies[0]?.id ?? null);

        if (billId) {
          const billRes = await api.getBill(Number(billId));
          if (cancelled) return;
          const bill = billRes.data.bill;
          if (!bill.isOwner) {
            setError("You are not authorized to edit this bill.");
            setLoadFailed(true);
            return;
          }
          setTitle(bill.title);
          setRestaurantName(bill.restaurantName || "");
          setCurrencyId(bill.currency.id);
          setCharges(bill.charges);
          setShareToken(bill.shareToken || null);
          setSavedId(bill.id);
          setItems(
            bill.items.map((item) => ({
              key: String(item.id),
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              notes: item.notes,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Could not load bill."));
          if (billId) setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [billId]);

  function addItem(item: Omit<DraftItem, "key" | "id">) {
    setItems((current) => [...current, { ...item, key: newKey() }]);
    setError("");
  }

  function saveEditedItem(item: Omit<DraftItem, "key" | "id">) {
    if (!editing) return;
    setItems((current) =>
      current.map((row) => (row.key === editing.key ? { ...row, ...item } : row))
    );
    setEditing(null);
  }

  async function save() {
    if (!currency) return;
    const trimmed = title.trim();
    const trimmedRestaurant = restaurantName.trim();
    let nextTitleError = "";
    let nextRestaurantError = "";
    if (!trimmed) {
      nextTitleError = "Bill title is required.";
    }
    if (trimmedRestaurant.length > 255) {
      nextRestaurantError = "Restaurant name must be at most 255 characters.";
    }
    setTitleError(nextTitleError);
    setRestaurantError(nextRestaurantError);
    if (nextTitleError || nextRestaurantError) return;
    setSaving(true);
    setError("");
    const payload = {
      title: trimmed,
      restaurantName: trimmedRestaurant || null,
      currencyId: currency.id,
      tax: charges.tax,
      service: charges.service,
      discount: charges.discount,
      discountType: charges.discountType,
      discountTiming: charges.discountTiming,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };
    try {
      if (savedId) {
        const res = await api.updateBill(savedId, payload);
        setSavedId(res.data.bill.id);
        setShareToken(res.data.bill.shareToken || shareToken);
        setRestaurantName(res.data.bill.restaurantName || "");
        setItems(
          res.data.bill.items.map((item) => ({
            key: String(item.id),
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes,
          }))
        );
        notify("success", "Bill saved successfully.");
      } else {
        const res = await api.createBill(payload);
        setSavedId(res.data.bill.id);
        setShareToken(res.data.bill.shareToken || null);
        notify("success", "Bill created successfully.");
        navigate(`/bills/${res.data.bill.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not save bill."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout narrow>
        <StatusMessage>Loading bill...</StatusMessage>
      </Layout>
    );
  }

  if (loadFailed) {
    return (
      <Layout narrow>
        <h1 className="page-title">Edit bill</h1>
        <AlertMessage type="error" message={error} />
      </Layout>
    );
  }

  if (!currency) {
    return (
      <Layout narrow>
        <AlertMessage type="error" message="No currencies are available." />
      </Layout>
    );
  }

  return (
    <Layout narrow>
      <h1 className="page-title">{isNew && !savedId ? "New bill" : "Edit bill"}</h1>

      <section className="card">
        <h2>Bill information</h2>
        <div className="stack">
          <div className="field">
            <label htmlFor="title">Bill title</label>
            <input
              id="title"
              className={`input${titleError ? " input-invalid" : ""}`}
              value={title}
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "title-error" : undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError("");
              }}
              placeholder="Dinner at Sushi Place"
            />
            <FieldError id="title-error" message={titleError} />
          </div>
          <div className="field">
            <label htmlFor="restaurant-name">Restaurant name (optional)</label>
            <input
              id="restaurant-name"
              className={`input${restaurantError ? " input-invalid" : ""}`}
              value={restaurantName}
              aria-invalid={Boolean(restaurantError)}
              aria-describedby={restaurantError ? "restaurant-name-error" : undefined}
              onChange={(e) => {
                setRestaurantName(e.target.value);
                setRestaurantError("");
              }}
              placeholder="Enter restaurant name"
            />
            <FieldError id="restaurant-name-error" message={restaurantError} />
          </div>
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              className="select"
              value={currency.id}
              onChange={(e) => setCurrencyId(Number(e.target.value))}
            >
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>{editing ? "Edit item" : "Add item"}</h2>
        {editing ? (
          <>
            <ItemForm
              key={editing.key}
              currency={currency}
              initial={editing}
              submitLabel="Save item"
              onSubmit={saveEditedItem}
            />
            <Button className="btn-secondary btn-block" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </>
        ) : (
          <ItemForm currency={currency} onSubmit={addItem} />
        )}
      </section>

      <section className="card">
        <h2>All orders</h2>
        <ItemList
          items={items}
          currency={currency}
          editable
          onEdit={setEditing}
          onDelete={(item) => setItems((current) => current.filter((row) => row.key !== item.key))}
        />
      </section>

      <section className="card">
        <h2>Discount / Service / Tax</h2>
        <ChargesForm key={currency.id} currency={currency} charges={charges} onChange={setCharges} />
      </section>

      <section className="card">
        <h2>Bill summary</h2>
        <BillSummary items={items} charges={charges} currency={currency} />
      </section>

      <AlertMessage type="error" message={error} />

      <Button
        className="btn-block"
        loading={saving}
        loadingLabel={savedId ? "Saving..." : "Creating bill..."}
        onClick={() => void save()}
      >
        {savedId ? "Save bill" : "Create bill"}
      </Button>

      {savedId ? (
        <>
          <div className="actions" style={{ margin: "1rem 0" }}>
            <Link className="btn btn-secondary" to={`/bills/${savedId}`}>
              Open bill
            </Link>
          </div>
          <section className="card">
            <h2>Share bill</h2>
            <ShareBillPanel billId={savedId} shareToken={shareToken} />
          </section>
        </>
      ) : null}
    </Layout>
  );
}
