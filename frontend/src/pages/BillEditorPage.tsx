import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout, Button } from "../components/Layout";
import { ItemForm } from "../components/ItemForm";
import { ItemList } from "../components/ItemList";
import type { DraftItem } from "../components/ItemList";
import { ChargesForm } from "../components/ChargesForm";
import { BillSummary } from "../components/BillSummary";
import { ShareBillPanel } from "../components/ShareBillPanel";
import { AccountPrompt, AlertMessage, FieldError, useToast } from "../components/Feedback";
import { Loading } from "../components/Loading";
import { api } from "../services/api";
import { getErrorMessage, useAuth } from "../hooks/useAuth";
import { billSubtotal } from "../utils/calculations";
import type { BillCharges, Currency } from "../types";

const emptyCharges: BillCharges = {
  discount: 0,
  discountType: "PERCENTAGE",
  discountTiming: "BEFORE_CHARGES",
  service: 0,
  tax: 0,
};

const GUEST_DRAFT_KEY = "easysplitbill:guest-draft";
const SAVE_SHARE_MESSAGE = "Create an account or login to save or share your bill.";

interface GuestDraft {
  title: string;
  restaurantName: string;
  currencyId: number | null;
  items: Array<{
    key: string;
    name: string;
    price: number;
    quantity: number;
    notes: string | null;
  }>;
  charges: BillCharges;
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isCharges(value: unknown): value is BillCharges {
  if (!value || typeof value !== "object") return false;
  const charges = value as BillCharges;
  return (
    typeof charges.discount === "number" &&
    typeof charges.service === "number" &&
    typeof charges.tax === "number" &&
    (charges.discountType === "PERCENTAGE" || charges.discountType === "FIXED") &&
    (charges.discountTiming === "BEFORE_CHARGES" || charges.discountTiming === "AFTER_CHARGES")
  );
}

function readGuestDraft(): GuestDraft | null {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GuestDraft;
    if (!data || typeof data !== "object") return null;
    if (typeof data.title !== "string" || typeof data.restaurantName !== "string") return null;
    if (data.currencyId !== null && typeof data.currencyId !== "number") return null;
    if (!Array.isArray(data.items) || !isCharges(data.charges)) return null;
    return {
      title: data.title,
      restaurantName: data.restaurantName,
      currencyId: data.currencyId,
      charges: data.charges,
      items: data.items
        .filter(
          (item) =>
            item &&
            typeof item.name === "string" &&
            typeof item.price === "number" &&
            typeof item.quantity === "number"
        )
        .map((item) => ({
          key: typeof item.key === "string" ? item.key : newKey(),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: typeof item.notes === "string" ? item.notes : null,
        })),
    };
  } catch {
    return null;
  }
}

function writeGuestDraft(draft: GuestDraft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / private-mode failures */
  }
}

function clearGuestDraft() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function BillEditorPage() {
  const { billId } = useParams();
  const isNew = !billId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [title, setTitle] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [currencyId, setCurrencyId] = useState<number | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [charges, setCharges] = useState<BillCharges>(emptyCharges);
  const [editing, setEditing] = useState<DraftItem | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(billId ? Number(billId) : null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currencyError, setCurrencyError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [restaurantError, setRestaurantError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const draftReady = useRef(false);
  const { notify } = useToast();

  const currency = useMemo(
    () => currencies.find((c) => c.id === currencyId) || currencies[0],
    [currencies, currencyId]
  );

  const itemsSubtotal = useMemo(() => billSubtotal(items), [items]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const currencyRes = await api.currencies();
        if (cancelled) return;
        setCurrencies(currencyRes.data.currencies);
        setCurrencyError("");
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
        } else {
          const draft = readGuestDraft();
          if (draft) {
            setTitle(draft.title);
            setRestaurantName(draft.restaurantName);
            setCharges(draft.charges);
            setItems(draft.items);
            if (
              draft.currencyId &&
              currencyRes.data.currencies.some((c) => c.id === draft.currencyId)
            ) {
              setCurrencyId(draft.currencyId);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (billId) {
            setError(getErrorMessage(err, "Could not load bill."));
            setLoadFailed(true);
          } else {
            setCurrencyError(getErrorMessage(err, "Failed to load currencies."));
          }
        }
      } finally {
        if (!cancelled) {
          draftReady.current = true;
          setLoading(false);
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [billId]);

  useEffect(() => {
    if (!isNew || user || loading || !draftReady.current) return;
    writeGuestDraft({
      title,
      restaurantName,
      currencyId,
      items: items.map((item) => ({
        key: item.key,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
      charges,
    });
  }, [title, restaurantName, currencyId, items, charges, isNew, user, loading]);

  function persistGuestDraft() {
    writeGuestDraft({
      title,
      restaurantName,
      currencyId,
      items: items.map((item) => ({
        key: item.key,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
      charges,
    });
  }

  function requireAccount() {
    persistGuestDraft();
    notify("info", SAVE_SHARE_MESSAGE);
  }

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
    if (!user) {
      requireAccount();
      return;
    }
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
        clearGuestDraft();
      } else {
        const res = await api.createBill(payload);
        setSavedId(res.data.bill.id);
        setShareToken(res.data.bill.shareToken || null);
        notify("success", "Bill created successfully.");
        clearGuestDraft();
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
      <Layout>
        <h1 className="page-title">{isNew && !savedId ? "New bill" : "Edit bill"}</h1>
        <Loading message={isNew && !savedId ? "Loading currencies..." : "Loading bill..."} />
      </Layout>
    );
  }

  if (loadFailed) {
    return (
      <Layout>
        <h1 className="page-title">Edit bill</h1>
        <AlertMessage type="error" message={error} />
      </Layout>
    );
  }

  if (currencyError) {
    return (
      <Layout>
        <h1 className="page-title">New bill</h1>
        <AlertMessage type="error" message={currencyError} />
      </Layout>
    );
  }

  if (!currency) {
    return (
      <Layout>
        <h1 className="page-title">{isNew && !savedId ? "New bill" : "Edit bill"}</h1>
        <AlertMessage type="error" message="No currencies are available." />
      </Layout>
    );
  }

  return (
    <Layout>
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
              placeholder="Dinner With Friends"
            />
            <FieldError id="title-error" message={titleError} />
          </div>
          <div className="fields-split fields-split-wide">
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
        <ChargesForm
          key={currency.id}
          currency={currency}
          charges={charges}
          subtotal={itemsSubtotal}
          onChange={setCharges}
        />
      </section>

      <section className="card">
        <h2>Bill summary</h2>
        <BillSummary items={items} charges={charges} currency={currency} />
      </section>

      <AlertMessage type="error" message={error} />

      {!user && isNew ? (
        <AccountPrompt
          note="You can create and calculate this bill as a guest."
          message={SAVE_SHARE_MESSAGE}
          redirect="/bills/new"
          onNavigate={persistGuestDraft}
        />
      ) : null}

      <Button
        className="btn-block"
        loading={saving}
        loadingLabel={savedId ? "Saving..." : "Creating bill..."}
        onClick={() => void save()}
      >
        {savedId ? "Save bill" : "Create bill"}
      </Button>

      {!user && isNew ? (
        <Button className="btn-secondary btn-block" onClick={requireAccount} style={{ marginTop: "1rem" }}>
          Share bill
        </Button>
      ) : null}

      {savedId ? (
        <>
          <Link className="btn btn-secondary btn-block" to={`/bills/${savedId}`} style={{ margin: "1rem 0" }}>
            Open bill
          </Link>
          <section className="card">
            <h2>Share bill</h2>
            <ShareBillPanel billId={savedId} shareToken={shareToken} />
          </section>
        </>
      ) : null}
    </Layout>
  );
}
