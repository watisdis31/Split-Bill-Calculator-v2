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
          lineTotal: { type: Type.NUMBER, nullable: true },
          notes: { type: Type.STRING, nullable: true },
        },
        required: ['name', 'quantity', 'unitPrice'],
      },
    },
    subtotal: { type: Type.NUMBER, nullable: true },
    tax: { type: Type.NUMBER, nullable: true },
    service: { type: Type.NUMBER, nullable: true },
    discount: { type: Type.NUMBER, nullable: true },
    grandTotal: { type: Type.NUMBER, nullable: true },
  },
  required: ['items'],
};

const PROMPT = `Analyze this restaurant bill / receipt image carefully and extract structured data.

Process the receipt step-by-step:
1. Scan the receipt top-to-bottom to count total line items. Ensure every purchased item is accounted for.
2. Extract numeric values by correctly identifying thousands separators (e.g., in IDR, "25.000" or "25,000" represents 25000, NOT 25.0).

Rules:
- Return JSON matching the schema.
- Amounts: Convert prices to clean integer/float numbers in major currency units. Retain all full digits (e.g., convert "Rp 50.000" directly to 50000).
- unitPrice: Price for one single unit. If only line total is shown, calculate (line total / quantity).
- quantity: Integer, minimum 1.
- Items Array: Include only purchased food/drink items. Place charges, subtotals, taxes, tips, discounts, or service fees in their respective top-level fields instead of the items array.
- name: Primary item title only (e.g., "Bakmie Khas Sinilagi").
- notes: Secondary modifiers/options printed underneath the main item (e.g., "Hot", "Asin Gurih", "Sinilagi Blend - Medium"). Combine multiple modifiers with ", ". Ignore zero-price modifier entries ($0 / Rp 0). Set to null if none exist.
- Attach child options/modifiers directly to their parent item's notes field.
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

function normalizeScan(raw) {
  const source = Array.isArray(raw?.items) ? raw.items : [];
  const items = [];
  for (const item of source) {
    if (items.length >= MAX_ITEMS) break;
    const name =
      typeof item?.name === 'string' ? item.name.trim().slice(0, 200) : '';
    if (!name) continue;
    const unitPrice = toNumber(item.unitPrice);
    if (unitPrice === null || unitPrice <= 0) continue;
    let quantity = Math.round(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
    const notes =
      typeof item?.notes === 'string' && item.notes.trim() ?
        item.notes.trim().slice(0, 500)
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
    typeof raw?.restaurantName === 'string' && raw.restaurantName.trim() ?
      raw.restaurantName.trim().slice(0, 255)
    : null;
  const currencyCode =
    typeof raw?.currencyCode === 'string' && raw.currencyCode.trim() ?
      raw.currencyCode.trim().toUpperCase().slice(0, 8)
    : null;

  return {
    restaurantName,
    currencyCode,
    items,
    subtotal: toNumber(raw?.subtotal),
    tax: toNumber(raw?.tax),
    service: toNumber(raw?.service),
    discount: toNumber(raw?.discount),
    grandTotal: toNumber(raw?.grandTotal),
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
