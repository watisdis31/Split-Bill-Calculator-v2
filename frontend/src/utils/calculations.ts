/**
 * Split-bill calculation engine.
 * Keep in sync with backend/lib/calculations.js
 *
 * All money values are integer minor units.
 * PERCENTAGE discounts are integer basis points (10% = 1000).
 *
 * Discount timing:
 * - BEFORE_CHARGES: discount is based on item subtotal
 * - AFTER_CHARGES: discount is based on subtotal + tax + service
 *
 * Tax and service are fixed amounts, not recalculated from a discounted subtotal.
 */

import type { BillCharges, BillItem } from "../types";

export function itemTotal(item: { price: number; quantity: number }): number {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

export function billSubtotal(items: Array<{ price: number; quantity: number }>): number {
  return (items || []).reduce((sum, item) => sum + itemTotal(item), 0);
}

export function calculatePercentage(amount: number, subtotal: number): number | null {
  const base = Number(subtotal) || 0;
  if (base <= 0) return null;
  const value = ((Number(amount) || 0) / base) * 100;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function roundPercentageDisplay(percentage: number): string {
  const rounded = Math.round(percentage * 100) / 100;
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

function isDisplayablePercentage(percentage: number | null): percentage is number {
  return percentage !== null && Number.isFinite(percentage) && percentage >= 0;
}

export function formatChargePercentageIndicator(percentage: number | null): string {
  if (!isDisplayablePercentage(percentage)) return "—";
  return `≈ ${roundPercentageDisplay(percentage)}%`;
}

export function formatSummaryChargePercentage(percentage: number | null): string | null {
  if (!isDisplayablePercentage(percentage)) return null;
  return `${roundPercentageDisplay(percentage)}%`;
}

export function getDiscountBase(subtotal: number, charges: BillCharges): number {
  const items = Number(subtotal) || 0;
  if (charges.discountTiming === "AFTER_CHARGES") {
    return items + (Number(charges.tax) || 0) + (Number(charges.service) || 0);
  }
  return items;
}

export function getDiscountAmount(subtotal: number, charges: BillCharges): number {
  const value = Number(charges.discount) || 0;
  const base = getDiscountBase(subtotal, charges);
  if (value <= 0 || base <= 0) return 0;

  if (charges.discountType === "PERCENTAGE") {
    const amount = Math.round((base * value) / 10000);
    return Math.min(Math.max(amount, 0), base);
  }

  return Math.min(value, base);
}

export function getDiscountPercentageForDisplay(
  charges: BillCharges,
  subtotal: number,
  appliedDiscountAmount?: number
): number | null {
  if (charges.discountType === "PERCENTAGE") {
    const pct = (Number(charges.discount) || 0) / 100;
    if (!Number.isFinite(pct) || pct < 0) return null;
    return pct;
  }
  const amount = appliedDiscountAmount ?? (Number(charges.discount) || 0);
  return calculatePercentage(amount, getDiscountBase(subtotal, charges));
}

export function calculateBillTotals(
  items: Array<{ price: number; quantity: number }>,
  charges: BillCharges
) {
  const subtotal = billSubtotal(items);
  const discountAmount = getDiscountAmount(subtotal, charges);
  const service = Number(charges.service) || 0;
  const tax = Number(charges.tax) || 0;

  let total: number;
  if (charges.discountTiming === "AFTER_CHARGES") {
    total = Math.max(subtotal + service + tax - discountAmount, 0);
  } else {
    total = Math.max(subtotal - discountAmount, 0) + service + tax;
  }

  return { subtotal, discountAmount, service, tax, total };
}

function roundShare(amount: number, personal: number, divisor: number): number {
  if (divisor <= 0 || personal <= 0 || amount <= 0) return 0;
  return Math.round((amount * personal) / divisor);
}

export function personalSubtotal(
  items: BillItem[],
  selections: Record<number, number>
): number {
  return (items || []).reduce((sum, item) => {
    const selected = Number(selections[item.id] ?? 0) || 0;
    const qty = Math.min(Math.max(selected, 0), Number(item.quantity) || 0);
    return sum + (Number(item.price) || 0) * qty;
  }, 0);
}

export function calculatePersonalShare(
  items: BillItem[],
  charges: BillCharges,
  selections: Record<number, number>
) {
  const billTotalItems = billSubtotal(items);
  const yours = personalSubtotal(items, selections);
  const discountAmount = getDiscountAmount(billTotalItems, charges);
  const service = Number(charges.service) || 0;
  const tax = Number(charges.tax) || 0;

  if (billTotalItems <= 0 || yours <= 0) {
    return {
      billSubtotal: billTotalItems,
      personalSubtotal: yours,
      personalDiscount: 0,
      personalService: 0,
      personalTax: 0,
      finalAmount: 0,
      discountAmount,
    };
  }

  const personalDiscount = roundShare(discountAmount, yours, billTotalItems);
  const personalService = roundShare(service, yours, billTotalItems);
  const personalTax = roundShare(tax, yours, billTotalItems);

  return {
    billSubtotal: billTotalItems,
    personalSubtotal: yours,
    personalDiscount,
    personalService,
    personalTax,
    finalAmount: yours - personalDiscount + personalService + personalTax,
    discountAmount,
  };
}

export function unitPriceFromMultiple(totalPrice: number, quantity: number): number {
  const qty = Number(quantity) || 0;
  const total = Number(totalPrice) || 0;
  if (qty < 1 || total <= 0) return 0;
  return Math.round(total / qty);
}
