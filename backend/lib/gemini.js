import { GoogleGenAI, Type } from '@google/genai';

const MODEL = 'gemini-3.1-flash-lite';
//later after implementing image pre processing for size and boosted contrast, try gemini-3.1-flash-lite instead
const MAX_ITEMS = 100;

const BILL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    restaurantName: { type: Type.STRING, nullable: true },
    currencyCode: { type: Type.STRING, nullable: true },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.INTEGER },
          unitPrice: { type: Type.NUMBER },
          basePrice: { type: Type.NUMBER, nullable: true },
          lineTotal: { type: Type.NUMBER, nullable: true },
          notes: { type: Type.STRING, nullable: true },
          isModifier: { type: Type.BOOLEAN },
          modifiers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.NUMBER },
              },
              required: ['name'],
            },
          },
        },
        required: ['name', 'quantity', 'unitPrice'],
      },
    },
    subtotal: { type: Type.NUMBER, nullable: true },
    tax: { type: Type.NUMBER, nullable: true },
    service: { type: Type.NUMBER, nullable: true },
    discount: { type: Type.NUMBER, nullable: true },
    grandTotal: { type: Type.NUMBER, nullable: true },
    taxIncluded: { type: Type.BOOLEAN },
  },
  required: ['items'],
};

const PROMPT = `Analyze this restaurant bill / receipt image carefully and extract structured data.

Process the receipt step-by-step:
1. Scan the receipt top-to-bottom to count total line items. Ensure every purchased item is accounted for.
2. Extract numeric values by correctly identifying thousands separators (e.g., in IDR, "25.000" or "25,000" represents 25000, NOT 25.0).
3. After extracting items, check that the sum of (unitPrice × quantity) + service + tax (omit tax if taxIncluded) − discount equals grandTotal. If it does not, re-read the item prices before answering.

Rules:
- Return JSON matching the schema.
- Amounts: Convert prices to clean integer/float numbers in major currency units. Retain all full digits (e.g., convert "Rp 50.000" directly to 50000).
- quantity: Integer, minimum 1.
- Items Array: Include only purchased food/drink items. Place charges, subtotals, taxes, tips, discounts, or service fees in their respective top-level fields instead of the items array.
- name: Primary item title only (e.g., "Bakmie Khas Sinilagi", "Creamy Milk").
- basePrice: Printed unit price of the main item line. Use null if that line has no price and only modifiers carry prices.
- modifiers: Indentation is the signal. Any line printed indented under a parent item is a modifier of that parent even if it shows its own quantity and price. The indented quantity is the modifier count, not a new item. Attach every consecutive indented line to that parent until the next non-indented item. A zero-price modifier (PEDAS, ORIGINAL) does not end the modifier block; paid add-ons after it still belong to the same parent. Each modifier has name and price. Use price 0 when the line is unpriced or printed as Rp 0 / $0. Never emit a modifier as a top-level item. If a modifier line shows a total for quantity > 1, report the per-unit price (total / parent quantity).
  Example:
  1  Creamy Milk              22.000
     1  Double Mie Creamy      8.000
     1  PEDAS                      0
     1  Nasi Putih             6.000
  1  Goreng Polos             11.000
     1  Double Mie Gr Polos    5.000
     1  ORIGINAL                   0
     1  Sosis                  6.000
     1  Telur Dadar            7.000
  → two items only:
    Creamy Milk, basePrice 22000, modifiers [{Double Mie Creamy, 8000}, {PEDAS, 0}, {Nasi Putih, 6000}], unitPrice 36000.
    Goreng Polos, basePrice 11000, modifiers [{Double Mie Gr Polos, 5000}, {ORIGINAL, 0}, {Sosis, 6000}, {Telur Dadar, 7000}], unitPrice 29000.
  If you still output a subordinate line as its own item, you MUST set isModifier true on it so it can be merged into the item directly above. Never omit isModifier on an indented add-on.
- unitPrice: basePrice plus the sum of modifier prices. If only a line total is shown, use (line total / quantity).
- notes: Leave null when modifiers is used. Do not copy modifiers into notes.
- Indented discount, promo, or negative-price lines belong in the top-level discount field, not in modifiers.
- taxIncluded: true only if the receipt explicitly states that prices include tax. Match wording such as "tax included", "inclusive of tax", "incl. tax", "include PPN", "PPN included", "harga sudah termasuk pajak", "termasuk PPN", "sudah termasuk pajak & service". false when tax is a separate added line with no such wording, or when unclear. Still report the printed tax amount even when taxIncluded is true.
- currencyCode: 3-letter ISO code (e.g., IDR, USD) if identifiable; otherwise null.
- restaurantName: Venue name if printed; otherwise null.
- Null Values: Use null for unreadable or missing fields. Do not guess ambiguous numbers.`;

let client = null;

export function isGeminiConfigured() {
  return Boolean((process.env.GEMINI_API_KEY || '').trim());
}

function getClient() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function formatModifierPrice(amount, currencyCode) {
  if (currencyCode === 'IDR') {
    return new Intl.NumberFormat('id-ID').format(amount);
  }
  return new Intl.NumberFormat('en-US').format(amount);
}

function parseModifiers(rawModifiers) {
  if (!Array.isArray(rawModifiers)) return [];
  const modifiers = [];
  for (const modifier of rawModifiers) {
    const name =
      typeof modifier?.name === 'string' ? modifier.name.trim() : '';
    if (!name) continue;
    const rawPrice = toNumber(modifier.price);
    const price = rawPrice === null || rawPrice < 0 ? 0 : rawPrice;
    modifiers.push({ name, price });
  }
  return modifiers;
}

function modifierNote(name, price, currencyCode) {
  return price > 0
    ? `${name} (+${formatModifierPrice(price, currencyCode)})`
    : name;
}

function buildNotes(modifiers, extraNotes, currencyCode) {
  const parts = modifiers.map((modifier) =>
    modifierNote(modifier.name, modifier.price, currencyCode),
  );
  if (typeof extraNotes === 'string' && extraNotes.trim()) {
    parts.push(extraNotes.trim());
  }
  const joined = parts.join(', ').slice(0, 500);
  return joined || null;
}

function appendModifierNote(parent, name, price, currencyCode) {
  const fragment = modifierNote(name, price, currencyCode);
  parent.notes = parent.notes
    ? `${parent.notes}, ${fragment}`.slice(0, 500)
    : fragment.slice(0, 500);
}

function amountsClose(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= tolerance;
}

export function normalizeScan(raw) {
  const source = Array.isArray(raw?.items) ? raw.items : [];
  const currencyCode =
    typeof raw?.currencyCode === 'string' && raw.currencyCode.trim()
      ? raw.currencyCode.trim().toUpperCase().slice(0, 8)
      : null;

  const items = [];
  for (const item of source) {
    if (items.length >= MAX_ITEMS) break;
    const name =
      typeof item?.name === 'string' ? item.name.trim().slice(0, 200) : '';
    if (!name) continue;
    let quantity = Math.round(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;

    if (item?.isModifier === true && items.length > 0) {
      const parent = items[items.length - 1];
      let price = toNumber(item.unitPrice) ?? 0;
      if (price < 0) price = 0;
      const perUnit = Math.round((price * quantity) / parent.quantity);
      parent.unitPrice += perUnit;
      appendModifierNote(parent, name, perUnit, currencyCode);
      continue;
    }

    const modifiers = parseModifiers(item.modifiers);
    const paidSum = modifiers.reduce((sum, modifier) => sum + modifier.price, 0);
    const base = toNumber(item.basePrice);
    const unitPriceRaw = toNumber(item.unitPrice);
    const unitPrice = base !== null ? base + paidSum : unitPriceRaw;
    if (unitPrice === null || unitPrice <= 0) continue;

    const extraNotes =
      typeof item?.notes === 'string' && item.notes.trim() ? item.notes.trim() : null;
    const notes =
      modifiers.length > 0
        ? buildNotes(modifiers, extraNotes, currencyCode)
        : extraNotes
          ? extraNotes.slice(0, 500)
          : null;

    items.push({
      name,
      quantity,
      unitPrice,
      lineTotal: toNumber(item.lineTotal),
      notes,
    });
  }

  const restaurantName =
    typeof raw?.restaurantName === 'string' && raw.restaurantName.trim()
      ? raw.restaurantName.trim().slice(0, 255)
      : null;

  const tax = toNumber(raw?.tax);
  const service = toNumber(raw?.service);
  const discount = toNumber(raw?.discount);
  const grandTotal = toNumber(raw?.grandTotal);
  let taxIncluded = raw?.taxIncluded === true;

  const itemsSum = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const taxAmount = tax ?? 0;
  const serviceAmount = service ?? 0;
  const discountAmount = discount ?? 0;
  let totalsMatch = null;
  if (grandTotal !== null) {
    const expectedExcl = itemsSum + serviceAmount + taxAmount - discountAmount;
    const expectedIncl = itemsSum + serviceAmount - discountAmount;
    const tolerance = Math.max(1, items.length);
    const exclMatch = amountsClose(expectedExcl, grandTotal, tolerance);
    const inclMatch = amountsClose(expectedIncl, grandTotal, tolerance);
    if (exclMatch && inclMatch) {
      totalsMatch = true;
    } else if (exclMatch) {
      taxIncluded = false;
      totalsMatch = true;
    } else if (inclMatch) {
      taxIncluded = true;
      totalsMatch = true;
    } else {
      totalsMatch = false;
    }
  }

  return {
    restaurantName,
    currencyCode,
    items,
    subtotal: toNumber(raw?.subtotal),
    tax,
    service,
    discount,
    grandTotal,
    taxIncluded,
    totalsMatch,
  };
}

function classifyGeminiError(error) {
  const status =
    error?.status ?? error?.code ?? error?.error?.code ?? error?.error?.status;
  const message = String(error?.message || error || '');
  const combined = `${status} ${message}`.toUpperCase();
  if (status === 503 || combined.includes('UNAVAILABLE')) {
    throw new Error('TEMPORARY_UNAVAILABLE');
  }
  if (status === 429 || combined.includes('RESOURCE_EXHAUSTED')) {
    throw new Error('QUOTA');
  }
  if (
    status === 401 ||
    status === 403 ||
    combined.includes('API_KEY_INVALID') ||
    combined.includes('INVALID_API_KEY') ||
    combined.includes('PERMISSION_DENIED')
  ) {
    throw new Error('BAD_KEY');
  }
}

export async function scanBillImage({ mimeType, data }) {
  const ai = getClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: PROMPT }, { inlineData: { mimeType, data } }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: BILL_SCHEMA,
        temperature: 0,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (error) {
    classifyGeminiError(error);
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error('UNREADABLE');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('UNREADABLE');
  }

  return normalizeScan(parsed);
}
