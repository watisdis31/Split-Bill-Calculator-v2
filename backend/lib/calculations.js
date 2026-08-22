/**
 * Split-bill calculation engine.
 * Keep in sync with frontend/src/utils/calculations.ts
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

export function itemTotal(item) {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

export function billSubtotal(items) {
  return (items || []).reduce((sum, item) => sum + itemTotal(item), 0);
}

export function getDiscountBase(subtotal, charges) {
  const items = Number(subtotal) || 0;
  if (charges.discountTiming === "AFTER_CHARGES") {
    return items + (Number(charges.tax) || 0) + (Number(charges.service) || 0);
  }
  return items;
}

export function getDiscountAmount(subtotal, charges) {
  const value = Number(charges.discount) || 0;
  const base = getDiscountBase(subtotal, charges);
  if (value <= 0 || base <= 0) return 0;

  if (charges.discountType === "PERCENTAGE") {
    const amount = Math.round((base * value) / 10000);
    return Math.min(Math.max(amount, 0), base);
  }

  return Math.min(value, base);
}

export function calculateBillTotals(items, charges) {
  const subtotal = billSubtotal(items);
  const discountAmount = getDiscountAmount(subtotal, charges);
  const service = Number(charges.service) || 0;
  const tax = Number(charges.tax) || 0;

  let total;
  if (charges.discountTiming === "AFTER_CHARGES") {
    total = Math.max(subtotal + service + tax - discountAmount, 0);
  } else {
    total = Math.max(subtotal - discountAmount, 0) + service + tax;
  }

  return {
    subtotal,
    discountAmount,
    service,
    tax,
    total,
  };
}

function roundShare(amount, personalSubtotal, divisor) {
  if (divisor <= 0 || personalSubtotal <= 0 || amount <= 0) return 0;
  return Math.round((amount * personalSubtotal) / divisor);
}

export function personalSubtotal(items, selections) {
  return (items || []).reduce((sum, item) => {
    const selected = Number(selections?.[item.id] ?? selections?.[item.ItemId] ?? 0) || 0;
    const qty = Math.min(Math.max(selected, 0), Number(item.quantity) || 0);
    return sum + (Number(item.price) || 0) * qty;
  }, 0);
}

export function calculatePersonalShare(items, charges, selections) {
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
  const finalAmount = yours - personalDiscount + personalService + personalTax;

  return {
    billSubtotal: billTotalItems,
    personalSubtotal: yours,
    personalDiscount,
    personalService,
    personalTax,
    finalAmount,
    discountAmount,
  };
}

export function unitPriceFromMultiple(totalPrice, quantity) {
  const qty = Number(quantity) || 0;
  const total = Number(totalPrice) || 0;
  if (qty < 1 || total <= 0) return 0;
  return Math.round(total / qty);
}
