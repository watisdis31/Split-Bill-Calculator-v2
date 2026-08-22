/**
 * Split-bill calculation engine.
 * Keep in sync with backend/lib/calculations.js
 *
 * All money values are integer minor units.
 * PERCENTAGE discounts are integer basis points (10% = 1000).
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
  return ((Number(amount) || 0) / base) * 100;
}

function roundPercentageDisplay(percentage: number): string {
  const rounded = Math.round(percentage * 100) / 100;
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function formatChargePercentageIndicator(percentage: number | null): string {
  if (percentage === null) return "—";
  return `≈ ${roundPercentageDisplay(percentage)}%`;
}

export function formatSummaryChargePercentage(percentage: number | null): string | null {
  if (percentage === null) return null;
  return `${roundPercentageDisplay(percentage)}%`;
}

export function getDiscountAmount(subtotal: number, charges: BillCharges): number {
  const value = Number(charges.discount) || 0;
  if (value <= 0 || subtotal <= 0) return 0;

  if (charges.discountType === "PERCENTAGE") {
    const amount = Math.round((subtotal * value) / 10000);
    return Math.min(Math.max(amount, 0), subtotal);
  }

  return Math.min(value, subtotal);
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

  let personalService: number;
  let personalTax: number;

  if (charges.discountTiming === "BEFORE_CHARGES") {
    const base = Math.max(billTotalItems - discountAmount, 1);
    personalService = roundShare(service, yours, base);
    personalTax = roundShare(tax, yours, base);
  } else {
    personalService = roundShare(service, yours, billTotalItems);
    personalTax = roundShare(tax, yours, billTotalItems);
  }

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
