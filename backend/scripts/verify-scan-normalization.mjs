/**
 * Run: node scripts/verify-scan-normalization.mjs
 */
import { normalizeScan } from '../lib/gemini.js';

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function itemsSum(scan) {
  return scan.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

const plain = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Latte', quantity: 1, unitPrice: 40000 }],
});
assertEqual(plain.items.length, 1, 'plain count');
assertEqual(plain.items[0].unitPrice, 40000, 'plain unitPrice');
assertEqual(plain.items[0].notes, null, 'plain notes');
assertEqual(plain.taxIncluded, false, 'plain taxIncluded');
assertEqual(plain.totalsMatch, null, 'plain totalsMatch');

const onePaid = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Latte',
      quantity: 1,
      unitPrice: 40000,
      basePrice: 40000,
      modifiers: [{ name: 'X', price: 8000 }],
    },
  ],
});
assertEqual(onePaid.items[0].unitPrice, 48000, 'one paid unitPrice');
assertEqual(onePaid.items[0].notes, 'X (+8.000)', 'one paid notes');

const multiplePaid = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Milk',
      quantity: 1,
      unitPrice: 22000,
      basePrice: 22000,
      modifiers: [
        { name: 'Double Mie Creamy', price: 8000 },
        { name: 'Nasi Putih', price: 6000 },
      ],
    },
  ],
});
assertEqual(multiplePaid.items[0].unitPrice, 36000, 'multiple paid unitPrice');
assertEqual(
  multiplePaid.items[0].notes,
  'Double Mie Creamy (+8.000), Nasi Putih (+6.000)',
  'multiple paid notes',
);

const zeroOnly = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Noodles',
      quantity: 1,
      unitPrice: 22000,
      basePrice: 22000,
      modifiers: [{ name: 'PEDAS', price: 0 }],
    },
  ],
});
assertEqual(zeroOnly.items[0].unitPrice, 22000, 'zero-price unitPrice');
assertEqual(zeroOnly.items[0].notes, 'PEDAS', 'zero-price notes');

const mixed = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Creamy Milk',
      quantity: 1,
      unitPrice: 22000,
      basePrice: 22000,
      modifiers: [
        { name: 'Double Mie Creamy', price: 8000 },
        { name: 'PEDAS', price: 0 },
        { name: 'Nasi Putih', price: 6000 },
      ],
    },
  ],
});
assertEqual(mixed.items[0].unitPrice, 36000, 'mixed unitPrice');
assertEqual(
  mixed.items[0].notes,
  'Double Mie Creamy (+8.000), PEDAS, Nasi Putih (+6.000)',
  'mixed notes',
);

const separateAddon = normalizeScan({
  currencyCode: 'IDR',
  items: [
    { name: 'Creamy Milk', quantity: 1, unitPrice: 22000 },
    { name: 'Telor', quantity: 1, unitPrice: 8000, isModifier: true },
  ],
});
assertEqual(separateAddon.items.length, 1, 'separate addon count');
assertEqual(separateAddon.items[0].name, 'Creamy Milk', 'separate addon name');
assertEqual(separateAddon.items[0].unitPrice, 30000, 'separate addon unitPrice');
assertEqual(separateAddon.items[0].notes, 'Telor (+8.000)', 'separate addon notes');

const zeroSeparate = normalizeScan({
  currencyCode: 'IDR',
  items: [
    { name: 'Creamy Milk', quantity: 1, unitPrice: 22000 },
    { name: 'PEDAS', quantity: 1, unitPrice: 0, isModifier: true },
  ],
});
assertEqual(zeroSeparate.items.length, 1, 'zero separate count');
assertEqual(zeroSeparate.items[0].unitPrice, 22000, 'zero separate unitPrice');
assertEqual(zeroSeparate.items[0].notes, 'PEDAS', 'zero separate notes');

const mixedSources = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Creamy Milk',
      quantity: 1,
      unitPrice: 22000,
      basePrice: 22000,
      modifiers: [{ name: 'Double Mie Creamy', price: 8000 }],
    },
    { name: 'PEDAS', quantity: 1, unitPrice: 0, isModifier: true },
  ],
});
assertEqual(mixedSources.items.length, 1, 'mixed sources count');
assertEqual(mixedSources.items[0].unitPrice, 30000, 'mixed sources unitPrice');
assertEqual(
  mixedSources.items[0].notes,
  'Double Mie Creamy (+8.000), PEDAS',
  'mixed sources notes',
);

const parentQtyMatch = normalizeScan({
  currencyCode: 'IDR',
  items: [
    { name: 'Noodles', quantity: 2, unitPrice: 20000 },
    { name: 'Extra egg', quantity: 2, unitPrice: 8000, isModifier: true },
  ],
});
assertEqual(parentQtyMatch.items[0].unitPrice, 28000, 'parent qty match unitPrice');

const parentQtyHalf = normalizeScan({
  currencyCode: 'IDR',
  items: [
    { name: 'Noodles', quantity: 2, unitPrice: 20000 },
    { name: 'Extra egg', quantity: 1, unitPrice: 8000, isModifier: true },
  ],
});
assertEqual(parentQtyHalf.items[0].unitPrice, 24000, 'parent qty half unitPrice');

const firstIsModifier = normalizeScan({
  currencyCode: 'IDR',
  items: [
    { name: 'Telor', quantity: 1, unitPrice: 8000, isModifier: true },
    { name: 'Creamy Milk', quantity: 1, unitPrice: 22000 },
  ],
});
assertEqual(firstIsModifier.items.length, 2, 'first isModifier stays item');
assertEqual(firstIsModifier.items[0].name, 'Telor', 'first isModifier name');
assertEqual(firstIsModifier.items[0].unitPrice, 8000, 'first isModifier price');
assertEqual(firstIsModifier.items[0].notes, null, 'first isModifier notes');

const ropopang = normalizeScan({
  currencyCode: 'IDR',
  items: [
    { name: 'Creamy Milk', quantity: 1, unitPrice: 22000 },
    { name: 'Double Mie Creamy', quantity: 1, unitPrice: 8000, isModifier: true },
    { name: 'PEDAS', quantity: 1, unitPrice: 0, isModifier: true },
    { name: 'Nasi Putih', quantity: 1, unitPrice: 6000, isModifier: true },
    { name: 'Goreng Polos', quantity: 1, unitPrice: 11000 },
    { name: 'Double Mie Gr Polos', quantity: 1, unitPrice: 5000, isModifier: true },
    { name: 'ORIGINAL', quantity: 1, unitPrice: 0, isModifier: true },
    { name: 'Sosis', quantity: 1, unitPrice: 6000, isModifier: true },
    { name: 'Telur Dadar', quantity: 1, unitPrice: 7000, isModifier: true },
    { name: 'Sweet Ice Tea', quantity: 1, unitPrice: 10000 },
    { name: 'Tipker Polos', quantity: 1, unitPrice: 18000 },
    { name: 'Dirty Matcha', quantity: 1, unitPrice: 32000 },
    { name: 'Ice Tea', quantity: 1, unitPrice: 9000 },
    { name: 'Sate Taichan Original', quantity: 1, unitPrice: 28000 },
    { name: 'Sate Taichan Umami', quantity: 1, unitPrice: 32000 },
  ],
  subtotal: 194000,
  service: 9700,
  tax: 19400,
  grandTotal: 223100,
  taxIncluded: false,
});
assertEqual(ropopang.items.length, 8, 'ropopang count');
assertEqual(ropopang.items[0].unitPrice, 36000, 'ropopang creamy');
assertEqual(
  ropopang.items[0].notes,
  'Double Mie Creamy (+8.000), PEDAS, Nasi Putih (+6.000)',
  'ropopang creamy notes',
);
assertEqual(ropopang.items[1].unitPrice, 29000, 'ropopang goreng');
assertEqual(itemsSum(ropopang), 194000, 'ropopang itemsSum');
assertEqual(ropopang.taxIncluded, false, 'ropopang taxIncluded');
assertEqual(ropopang.totalsMatch, true, 'ropopang totalsMatch');

const legacy = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Bakmie Khas Sinilagi',
      quantity: 4,
      unitPrice: 55000,
      notes: 'Asin Gurih',
    },
  ],
});
assertEqual(legacy.items[0].unitPrice, 55000, 'legacy unitPrice');
assertEqual(legacy.items[0].notes, 'Asin Gurih', 'legacy notes');

const qtyParent = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Noodles',
      quantity: 2,
      unitPrice: 20000,
      basePrice: 20000,
      modifiers: [{ name: 'Extra egg', price: 3500 }],
    },
  ],
});
assertEqual(qtyParent.items[0].unitPrice, 23500, 'qty parent unitPrice');
assertEqual(qtyParent.items[0].quantity, 2, 'qty parent quantity');

const negative = normalizeScan({
  currencyCode: 'IDR',
  items: [
    {
      name: 'Rice',
      quantity: 1,
      unitPrice: 15000,
      basePrice: 15000,
      modifiers: [{ name: 'Staff discount', price: -2000 }],
    },
  ],
});
assertEqual(negative.items[0].unitPrice, 15000, 'negative modifier ignored in price');
assertEqual(negative.items[0].notes, 'Staff discount', 'negative modifier kept in notes');

const exclusive = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Tea', quantity: 1, unitPrice: 10000, basePrice: 10000 }],
  service: 1000,
  tax: 1000,
  grandTotal: 12000,
  taxIncluded: false,
});
assertEqual(exclusive.taxIncluded, false, 'exclusive flag');
assertEqual(exclusive.totalsMatch, true, 'exclusive match');

const inclusiveKept = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Tea', quantity: 1, unitPrice: 11000, basePrice: 11000 }],
  service: 1000,
  tax: 1000,
  grandTotal: 12000,
  taxIncluded: true,
});
assertEqual(inclusiveKept.taxIncluded, true, 'inclusive kept flag');
assertEqual(inclusiveKept.totalsMatch, true, 'inclusive kept match');
assertEqual(inclusiveKept.tax, 1000, 'inclusive printed tax retained');

const inclusiveCorrected = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Tea', quantity: 1, unitPrice: 11000, basePrice: 11000 }],
  service: 1000,
  tax: 1000,
  grandTotal: 12000,
  taxIncluded: false,
});
assertEqual(inclusiveCorrected.taxIncluded, true, 'inclusive corrected from false');
assertEqual(inclusiveCorrected.totalsMatch, true, 'inclusive corrected match');

const exclusiveCorrected = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Tea', quantity: 1, unitPrice: 10000, basePrice: 10000 }],
  service: 1000,
  tax: 1000,
  grandTotal: 12000,
  taxIncluded: true,
});
assertEqual(exclusiveCorrected.taxIncluded, false, 'exclusive corrected from true');
assertEqual(exclusiveCorrected.totalsMatch, true, 'exclusive corrected match');

const noTax = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Tea', quantity: 1, unitPrice: 10000, basePrice: 10000 }],
  service: 1000,
  tax: null,
  grandTotal: 11000,
});
assertEqual(noTax.tax, null, 'no tax remains null');
assertEqual(noTax.taxIncluded, false, 'no tax flag');
assertEqual(noTax.totalsMatch, true, 'no tax match');

const ambiguous = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Tea', quantity: 1, unitPrice: 10000, basePrice: 10000 }],
  tax: 1000,
  taxIncluded: true,
});
assertEqual(ambiguous.taxIncluded, true, 'ambiguous keeps returned flag');
assertEqual(ambiguous.totalsMatch, null, 'ambiguous totalsMatch');

const mismatch = normalizeScan({
  currencyCode: 'IDR',
  items: [{ name: 'Tea', quantity: 1, unitPrice: 10000, basePrice: 10000 }],
  service: 1000,
  tax: 1000,
  grandTotal: 99999,
  taxIncluded: false,
});
assertEqual(mismatch.taxIncluded, false, 'mismatch keeps flag');
assertEqual(mismatch.totalsMatch, false, 'mismatch totalsMatch');

console.log('scan normalization checks passed');
