export type DiscountType = "PERCENTAGE" | "FIXED";
export type DiscountTiming = "BEFORE_CHARGES" | "AFTER_CHARGES";

export interface User {
  id: number;
  username: string;
  createdAt?: string | null;
}

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

export interface BillItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillCharges {
  discount: number;
  discountType: DiscountType;
  discountTiming: DiscountTiming;
  service: number;
  tax: number;
}

export interface BillTotals {
  subtotal: number;
  discountAmount: number;
  service: number;
  tax: number;
  total: number;
}

export interface Bill {
  id: number;
  title: string;
  restaurantName: string | null;
  ownerId?: number;
  isOwner: boolean;
  currency: Currency;
  items: BillItem[];
  charges: BillCharges;
  totals: BillTotals;
  shareToken?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BillListItem {
  id: number;
  title: string;
  restaurantName: string | null;
  ownerId?: number;
  ownerUsername?: string | null;
  isOwner: boolean;
  currency: Currency;
  charges: BillCharges;
  totals: BillTotals;
  createdAt: string;
  updatedAt?: string;
}

export interface SharedBillAccess {
  isOwner: boolean;
  isSaved: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
