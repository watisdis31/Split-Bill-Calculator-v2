import { ApiError } from "../types";
import type {
  ApiSuccess,
  Bill,
  BillCharges,
  BillItem,
  BillListItem,
  Currency,
  SharedBillAccess,
  User,
} from "../types";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiSuccess<T>> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError("Network error. Please check your connection.", 0);
  }

  let json: { success?: boolean; message?: string; data?: T } = {};
  try {
    json = await response.json();
  } catch {
    throw new ApiError("Unexpected backend error", response.status || 500);
  }

  if (!response.ok || json.success === false) {
    throw new ApiError(json.message || "Request failed", response.status || 500);
  }

  return json as ApiSuccess<T>;
}

export const api = {
  register(username: string, password: string) {
    return request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  login(username: string, password: string) {
    return request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  logout() {
    return request<Record<string, never>>("/api/auth/logout", { method: "POST" });
  },
  me() {
    return request<{ user: User }>("/api/auth/me");
  },
  currencies() {
    return request<{ currencies: Currency[] }>("/api/currencies");
  },
  listBills({
    page = 1,
    limit = 5,
    scope = "owned",
    search = "",
    restaurant = "",
    month,
    year,
    sort = "desc",
  }: {
    page?: number;
    limit?: number;
    scope?: "owned" | "saved";
    search?: string;
    restaurant?: string;
    month?: number | "";
    year?: number | "";
    sort?: "asc" | "desc";
  } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      scope,
      sort: sort === "asc" ? "asc" : "desc",
    });
    const trimmed = search.trim();
    if (trimmed) params.set("search", trimmed);
    const trimmedRestaurant = restaurant.trim();
    if (trimmedRestaurant) params.set("restaurant", trimmedRestaurant);
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    return request<{
      bills: BillListItem[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      years: number[];
      restaurants: string[];
    }>(`/api/bills?${params.toString()}`);
  },
  getBill(billId: number) {
    return request<{ bill: Bill }>(`/api/bills/${billId}`);
  },
  createBill(payload: {
    title: string;
    restaurantName?: string | null;
    currencyId: number;
    tax: number;
    service: number;
    discount: number;
    discountType: BillCharges["discountType"];
    discountTiming: BillCharges["discountTiming"];
    items: Array<{ name: string; price: number; quantity: number; notes: string | null }>;
  }) {
    return request<{ bill: Bill }>("/api/bills", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateBill(
    billId: number,
    payload: {
      title?: string;
      restaurantName?: string | null;
      currencyId?: number;
      tax?: number;
      service?: number;
      discount?: number;
      discountType?: BillCharges["discountType"];
      discountTiming?: BillCharges["discountTiming"];
      items?: Array<{
        id?: number;
        name: string;
        price: number;
        quantity: number;
        notes: string | null;
      }>;
    }
  ) {
    return request<{ bill: Bill }>(`/api/bills/${billId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteBill(billId: number) {
    return request<Record<string, never>>(`/api/bills/${billId}`, { method: "DELETE" });
  },
  addItem(billId: number, item: Omit<BillItem, "id" | "createdAt" | "updatedAt">) {
    return request<{ item: BillItem }>(`/api/bills/${billId}/items`, {
      method: "POST",
      body: JSON.stringify(item),
    });
  },
  updateItem(itemId: number, item: Partial<Omit<BillItem, "id">>) {
    return request<{ item: BillItem }>(`/api/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(item),
    });
  },
  deleteItem(itemId: number) {
    return request<Record<string, never>>(`/api/items/${itemId}`, { method: "DELETE" });
  },
  shareBill(billId: number) {
    return request<{ shareToken: string; shareUrl: string; bill: Bill }>(
      `/api/bills/${billId}/share`,
      { method: "POST" }
    );
  },
  getSharedBill(shareToken: string) {
    return request<{ bill: Bill; access: SharedBillAccess }>(
      `/api/shared-bills/${encodeURIComponent(shareToken)}`
    );
  },
  saveSharedBill(shareToken: string) {
    return request<{ access: SharedBillAccess }>(
      `/api/shared-bills/${encodeURIComponent(shareToken)}/save`,
      { method: "POST" }
    );
  },
  unsaveSharedBill(shareToken: string) {
    return request<{ access: SharedBillAccess }>(
      `/api/shared-bills/${encodeURIComponent(shareToken)}/save`,
      { method: "DELETE" }
    );
  },
  unsaveBill(billId: number) {
    return request<{ access: SharedBillAccess }>(`/api/bills/${billId}/save`, {
      method: "DELETE",
    });
  },
};
