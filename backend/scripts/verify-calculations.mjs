function itemTotal(item) {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

function billSubtotal(items) {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}

function getDiscountAmount(subtotal, charges) {
  const value = Number(charges.discount) || 0;
  if (value <= 0 || subtotal <= 0) return 0;
  if (charges.discountType === "PERCENTAGE") {
    return Math.min(Math.max(Math.round((subtotal * value) / 10000), 0), subtotal);
  }
  return Math.min(value, subtotal);
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
    return { personalSubtotal: yours, personalDiscount: 0, personalService: 0, personalTax: 0, finalAmount: 0 };
  }
  const personalDiscount = roundShare(discountAmount, yours, billTotalItems);
  const base =
    charges.discountTiming === "BEFORE_CHARGES"
      ? Math.max(billTotalItems - discountAmount, 1)
      : billTotalItems;
  const personalService = roundShare(service, yours, base);
  const personalTax = roundShare(tax, yours, base);
  return {
    personalSubtotal: yours,
    personalDiscount,
    personalService,
    personalTax,
    finalAmount: yours - personalDiscount + personalService + personalTax,
  };
}

const items = [
  { id: 1, name: "Burger", price: 50000, quantity: 2 },
  { id: 2, name: "Drink", price: 20000, quantity: 3 },
];
const charges = {
  discount: 1000,
  discountType: "PERCENTAGE",
  discountTiming: "BEFORE_CHARGES",
  service: 25000,
  tax: 52500,
};

const bill = calculateBillTotals(items, charges);
if (bill.subtotal !== 160000) throw new Error(`subtotal ${bill.subtotal}`);
if (bill.discountAmount !== 16000) throw new Error(`discount ${bill.discountAmount}`);
if (bill.total !== 221500) throw new Error(`total ${bill.total}`);

const personal = calculatePersonalShare(items, charges, { 1: 1, 2: 2 });
if (personal.personalSubtotal !== 90000) throw new Error(`personal ${personal.personalSubtotal}`);

const after = calculatePersonalShare(items, { ...charges, discountTiming: "AFTER_CHARGES" }, { 1: 1, 2: 2 });
if (after.personalService === personal.personalService) {
  throw new Error("discount timing should change service allocation");
}

if (Math.round(60000 / 3) !== 20000) throw new Error("multiple items");

console.log("calculation checks passed");
console.log({ bill, personal, after });
