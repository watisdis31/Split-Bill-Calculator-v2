import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Layout";
import { BillCard } from "./BillCard";
import { BillToolbar } from "./BillToolbar";
import { AlertMessage } from "./Feedback";
import { Loading } from "./Loading";
import { api } from "../services/api";
import { getErrorMessage, useAuth } from "../hooks/useAuth";
import { ApiError } from "../types";
import type { BillListItem } from "../types";

const PAGE_SIZE = 5;

export function BillSection({
  title,
  scope,
  searchPlaceholder,
  emptyTitle,
  emptyCopy,
  emptyAction,
  headerAction,
  reloadToken = 0,
  renderActions,
}: {
  title: string;
  scope: "owned" | "saved";
  searchPlaceholder: string;
  emptyTitle: string;
  emptyCopy: string;
  emptyAction?: ReactNode;
  headerAction?: ReactNode;
  reloadToken?: number;
  renderActions: (bill: BillListItem) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [bills, setBills] = useState<BillListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [years, setYears] = useState<number[]>([]);
  const [restaurants, setRestaurants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const { user, loading: authLoading } = useAuth();

  const hasFilters = Boolean(search || restaurant || month || year || sort !== "desc");
  const noBills = hasLoaded && !loading && !error && bills.length === 0;
  const showEmptyAccount = noBills && !hasFilters;
  const showFilteredEmpty = noBills && hasFilters;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearch((current) => {
        if (current !== next) setPage(1);
        return next;
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (authLoading || !user) return;

    const id = ++requestId.current;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.listBills({
          page,
          limit: PAGE_SIZE,
          scope,
          search,
          restaurant,
          month: month ? Number(month) : "",
          year: year ? Number(year) : "",
          sort,
        });
        if (cancelled || id !== requestId.current) return;

        const pages = Math.max(1, res.data.totalPages || 1);
        if (res.data.total > 0 && page > pages) {
          setPage(pages);
          return;
        }

        setBills(Array.isArray(res.data.bills) ? res.data.bills : []);
        setTotalPages(pages);
        setYears(res.data.years || []);
        setRestaurants(Array.isArray(res.data.restaurants) ? res.data.restaurants : []);
      } catch (err) {
        if (cancelled || id !== requestId.current) return;
        if (err instanceof ApiError && err.status === 401) return;
        setError(getErrorMessage(err, "Could not load bills."));
      } finally {
        if (!cancelled && id === requestId.current) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, search, restaurant, month, year, sort, scope, reloadToken, authLoading, user]);

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setRestaurant("");
    setMonth("");
    setYear("");
    setSort("desc");
    setPage(1);
  }

  return (
    <section>
      {headerAction ? (
        <div className="bill-section-header">
          <h2 className="page-title bill-section-title">{title}</h2>
          {headerAction}
        </div>
      ) : (
        <h2 className="page-title bill-section-title">{title}</h2>
      )}

      {!hasLoaded ? (
        <section className="card">
          <Loading message="Loading bills..." />
        </section>
      ) : error && bills.length === 0 && !hasFilters ? (
        <AlertMessage type="error" message={error} />
      ) : showEmptyAccount ? (
        <section className="card empty">
          <p className="empty-title">{emptyTitle}</p>
          <p className="empty-copy">{emptyCopy}</p>
          {emptyAction}
        </section>
      ) : (
        <>
          <BillToolbar
            idPrefix={scope}
            search={searchInput}
            restaurant={restaurant}
            restaurants={restaurants}
            month={month}
            year={year}
            sort={sort}
            years={years}
            searchPlaceholder={searchPlaceholder}
            onSearchChange={setSearchInput}
            onRestaurantChange={(value) => {
              setRestaurant(value);
              setPage(1);
            }}
            onMonthChange={(value) => {
              setMonth(value);
              setPage(1);
            }}
            onYearChange={(value) => {
              setYear(value);
              setPage(1);
            }}
            onSortChange={(value) => {
              setSort(value);
              setPage(1);
            }}
            onReset={resetFilters}
          />

          {loading && bills.length === 0 ? (
            <section className="card">
              <Loading message="Loading bills..." />
            </section>
          ) : null}
          {loading && bills.length > 0 ? <Loading message="Updating bills..." inline /> : null}
          <AlertMessage type="error" message={error} />

          {showFilteredEmpty ? (
            <section className="card empty">
              <p className="empty-title">No matching bills</p>
              <p className="empty-copy">No bills match your current search or filters.</p>
              <Button className="btn-secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            </section>
          ) : null}

          {bills.map((bill) => (
            <BillCard bill={bill} key={bill.id}>
              {renderActions(bill)}
            </BillCard>
          ))}

          {totalPages > 1 ? (
            <div className="pager">
              <Button className="btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                className="btn-secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

