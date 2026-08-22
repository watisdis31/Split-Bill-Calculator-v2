/**
 * Keep in sync with backend/lib/calculations.js
 * Run: node scripts/verify-calculations.mjs
 */

function itemTotal(item) {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

function billSubtotal(items) {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}

function getDiscountBase(subtotal, charges) {
  const items = Number(subtotal) || 0;
  if (charges.discountTiming === "AFTER_CHARGES") {
    return items + (Number(charges.tax) || 0) + (Number(charges.service) || 0);
  }
  return items;
}

function getDiscountAmount(subtotal, charges) {
  const value = Number(charges.discount) || 0;
  const base = getDiscountBase(subtotal, charges);
  if (value <= 0 || base <= 0) return 0;
  if (charges.discountType === "PERCENTAGE") {
    return Math.min(Math.max(Math.round((base * value) / 10000), 0), base);
  }
  return Math.min(value, base);
}

function calculateBillTotals(items, charges) {
  const subtotal = billSubtotal(items);
  const discountAmount = getDiscountAmount(subtotal, charges);
  const service = Number(charges.service) || 0;
  const tax = Number(charges.tax) || 0;
  const total =
    charges.discountTiming === "AFTER_CHARGES"
      ? Math.max(subtotal + service + tax - discountAmount, 0)
      : Math.max(subtotal - discountAmount, 0) + service + tax;
  return { subtotal, discountAmount, service, tax, total };
}

function roundShare(amount, personal, divisor) {
  if (divisor <= 0 || personal <= 0 || amount <= 0) return 0;
  return Math.round((amount * personal) / divisor);
}

function calculatePersonalShare(items, charges, selections) {
  const billTotalItems = billSubtotal(items);
  const yours = items.reduce((sum, item) => {
    const selected = Number(selections[item.id] ?? 0) || 0;
    return sum + item.price * Math.min(Math.max(selected, 0), item.quantity);
  }, 0);
  const discountAmount = getDiscountAmount(billTotalItems, charges);
  const service = Number(charges.service) || 0;
  const tax = Number(charges.tax) || 0;
  if (billTotalItems <= 0 || yours <= 0) {
    return {
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
    personalSubtotal: yours,
    personalDiscount,
    personalService,
    personalTax,
    finalAmount: yours - personalDiscount + personalService + personalTax,
    discountAmount,
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function itemsFromSubtotal(subtotal) {
  return [{ id: 1, name: "Item", price: subtotal, quantity: 1 }];
}

const regressionItems = [
  { id: 1, name: "Burger", price: 50000, quantity: 2 },
  { id: 2, name: "Drink", price: 20000, quantity: 3 },
];
const regressionCharges = {
  discount: 1000,
  discountType: "PERCENTAGE",
  discountTiming: "BEFORE_CHARGES",
  service: 25000,
  tax: 52500,
};

const bill = calculateBillTotals(regressionItems, regressionCharges);
assertEqual(bill.subtotal, 160000, "subtotal");
assertEqual(bill.discountAmount, 16000, "discount");
assertEqual(bill.total, 221500, "total");

const personal = calculatePersonalShare(regressionItems, regressionCharges, { 1: 1, 2: 2 });
assertEqual(personal.personalSubtotal, 90000, "personal");
assertEqual(personal.personalDiscount, 9000, "personal discount");
assertEqual(personal.personalService, 14063, "personal service");
assertEqual(personal.personalTax, 29531, "personal tax");

const afterCharges = { ...regressionCharges, discountTiming: "AFTER_CHARGES" };
const afterBill = calculateBillTotals(regressionItems, afterCharges);
assertEqual(afterBill.discountAmount, 23750, "after discount");
assertEqual(afterBill.total, 213750, "after total");
if (afterBill.discountAmount === bill.discountAmount) {
  throw new Error("percentage discount timing should change discount amount");
}

const afterPersonal = calculatePersonalShare(regressionItems, afterCharges, { 1: 1, 2: 2 });
if (afterPersonal.personalDiscount === personal.personalDiscount) {
  throw new Error("discount timing should change personal discount");
}
assertEqual(afterPersonal.personalService, personal.personalService, "personal service allocation");
assertEqual(afterPersonal.personalTax, personal.personalTax, "personal tax allocation");

assertEqual(Math.round(60000 / 3), 20000, "multiple items");

const percentItems = itemsFromSubtotal(200000);
const percentBase = {
  discount: 1000,
  discountType: "PERCENTAGE",
  service: 10000,
  tax: 20000,
};
const percentBefore = calculateBillTotals(percentItems, {
  ...percentBase,
  discountTiming: "BEFORE_CHARGES",
});
const percentAfter = calculateBillTotals(percentItems, {
  ...percentBase,
  discountTiming: "AFTER_CHARGES",
});
assertEqual(percentBefore.discountAmount, 20000, "percent before discount");
assertEqual(percentBefore.tax, 20000, "percent before tax");
assertEqual(percentBefore.service, 10000, "percent before service");
assertEqual(percentBefore.total, 210000, "percent before total");
assertEqual(percentAfter.discountAmount, 23000, "percent after discount");
assertEqual(percentAfter.tax, 20000, "percent after tax");
assertEqual(percentAfter.service, 10000, "percent after service");
assertEqual(percentAfter.total, 207000, "percent after total");

const fixedItems = itemsFromSubtotal(200000);
const fixedBase = {
  discount: 25000,
  discountType: "FIXED",
  service: 10000,
  tax: 20000,
};
const fixedBefore = calculateBillTotals(fixedItems, {
  ...fixedBase,
  discountTiming: "BEFORE_CHARGES",
});
const fixedAfter = calculateBillTotals(fixedItems, {
  ...fixedBase,
  discountTiming: "AFTER_CHARGES",
});
assertEqual(fixedBefore.discountAmount, 25000, "fixed before discount");
assertEqual(fixedBefore.total, 205000, "fixed before total");
assertEqual(fixedAfter.discountAmount, 25000, "fixed after discount");
assertEqual(fixedAfter.total, 205000, "fixed after total");

const oversizedFixed = {
  discount: 215000,
  discountType: "FIXED",
  service: 10000,
  tax: 20000,
};
const oversizedBefore = calculateBillTotals(fixedItems, {
  ...oversizedFixed,
  discountTiming: "BEFORE_CHARGES",
});
const oversizedAfter = calculateBillTotals(fixedItems, {
  ...oversizedFixed,
  discountTiming: "AFTER_CHARGES",
});
assertEqual(oversizedBefore.discountAmount, 200000, "oversized fixed before cap");
assertEqual(oversizedBefore.total, 30000, "oversized fixed before total");
assertEqual(oversizedAfter.discountAmount, 215000, "oversized fixed after amount");
assertEqual(oversizedAfter.total, 15000, "oversized fixed after total");

const neither = calculateBillTotals(percentItems, {
  discount: 1000,
  discountType: "PERCENTAGE",
  discountTiming: "AFTER_CHARGES",
  service: 0,
  tax: 0,
});
assertEqual(neither.discountAmount, 20000, "neither after equals before");
assertEqual(neither.total, 180000, "neither after total");

const taxOnly = calculateBillTotals(percentItems, {
  discount: 1000,
  discountType: "PERCENTAGE",
  discountTiming: "AFTER_CHARGES",
  service: 0,
  tax: 20000,
});
assertEqual(taxOnly.discountAmount, 22000, "tax-only after discount");
assertEqual(taxOnly.total, 198000, "tax-only after total");

const serviceOnly = calculateBillTotals(percentItems, {
  discount: 1000,
  discountType: "PERCENTAGE",
  discountTiming: "AFTER_CHARGES",
  service: 10000,
  tax: 0,
});
assertEqual(serviceOnly.discountAmount, 21000, "service-only after discount");
assertEqual(serviceOnly.total, 189000, "service-only after total");

const zeroSubtotal = calculateBillTotals([], {
  discount: 1000,
  discountType: "PERCENTAGE",
  discountTiming: "AFTER_CHARGES",
  service: 10000,
  tax: 20000,
});
assertEqual(zeroSubtotal.discountAmount, 3000, "zero items after still discounts charges");
assertEqual(zeroSubtotal.total, 27000, "zero items after total");

const emptyBefore = calculateBillTotals([], {
  discount: 5000,
  discountType: "FIXED",
  discountTiming: "BEFORE_CHARGES",
  service: 10000,
  tax: 20000,
});
assertEqual(emptyBefore.discountAmount, 0, "fixed before with no items");
assertEqual(emptyBefore.total, 30000, "fixed before with no items total");

if (Math.round((50000 / 200000) * 10000) / 100 !== 25) {
  throw new Error("percentage display");
}

console.log("calculation checks passed");
console.log({
  percentBefore,
  percentAfter,
  fixedBefore,
  fixedAfter,
  oversizedBefore,
  oversizedAfter,
});
