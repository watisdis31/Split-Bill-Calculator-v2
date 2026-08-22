/**
 * Split-bill calculation engine.
 * Keep in sync with frontend/src/utils/calculations.ts
 *
 * All money values are integer minor units.
 * PERCENTAGE discounts are integer basis points (10% = 1000).
 */

export function itemTotal(item) {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

export function billSubtotal(items) {
  return (items || []).reduce((sum, item) => sum + itemTotal(item), 0);
}

export function getDiscountAmount(subtotal, charges) {
  const value = Number(charges.discount) || 0;
  if (value <= 0 || subtotal <= 0) return 0;

  if (charges.discountType === "PERCENTAGE") {
    const amount = Math.round((subtotal * value) / 10000);
    return Math.min(Math.max(amount, 0), subtotal);
  }

  return Math.min(value, subtotal);
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

  let personalService;
  let personalTax;

  if (charges.discountTiming === "BEFORE_CHARGES") {
    const base = Math.max(billTotalItems - discountAmount, 1);
    personalService = roundShare(service, yours, base);
    personalTax = roundShare(tax, yours, base);
  } else {
    personalService = roundShare(service, yours, billTotalItems);
    personalTax = roundShare(tax, yours, billTotalItems);
  }

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
