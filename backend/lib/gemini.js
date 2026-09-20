import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-3.6-flash";
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
        required: ["name", "quantity", "unitPrice"],
      },
    },
    subtotal: { type: Type.NUMBER, nullable: true },
    tax: { type: Type.NUMBER, nullable: true },
    service: { type: Type.NUMBER, nullable: true },
    discount: { type: Type.NUMBER, nullable: true },
    grandTotal: { type: Type.NUMBER, nullable: true },
  },
  required: ["items"],
};

const PROMPT = `Analyze this restaurant bill / receipt image and extract structured data.

Rules:
- Return JSON that matches the schema.
- Amounts are plain numbers in the receipt's own currency (major units, decimals allowed). Example: 12.50 or 50000.
- unitPrice is the price of one unit, not the line total. If the receipt only shows a line total, divide by quantity.
- quantity is an integer of at least 1.
- Do not include subtotal, tax, service charge, discount, or grand-total rows in items.
- name is the main dish or drink title only (for example "Bakmie Khas Sinilagi" or "Latte").
- notes is for indented or secondary modifier lines under that item: flavor, temperature, size, blend, extras. Examples: "Asin Gurih", "Hot", "Sinilagi Blend - Medium". Join multiple modifiers with ", ". Omit prices such as Rp 0 from notes. Use null when there is no modifier.
- Do not create a separate item for a modifier-only or zero-price option line; attach it to the parent item's notes.
- Use null when a value is not clearly printed. Do not guess.
- currencyCode is a 3-letter code such as IDR or USD when you can tell, otherwise null.
- restaurantName is the venue name if printed, otherwise null.`;

let client = null;

export function isGeminiConfigured() {
  return Boolean((process.env.GEMINI_API_KEY || "").trim());
}

function getClient() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeScan(raw) {
  const source = Array.isArray(raw?.items) ? raw.items : [];
  const items = [];
  for (const item of source) {
    if (items.length >= MAX_ITEMS) break;
    const name = typeof item?.name === "string" ? item.name.trim().slice(0, 200) : "";
    if (!name) continue;
    const unitPrice = toNumber(item.unitPrice);
    if (unitPrice === null || unitPrice <= 0) continue;
    let quantity = Math.round(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
    const notes =
      typeof item?.notes === "string" && item.notes.trim()
        ? item.notes.trim().slice(0, 500)
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
    typeof raw?.restaurantName === "string" && raw.restaurantName.trim()
      ? raw.restaurantName.trim().slice(0, 255)
      : null;
  const currencyCode =
    typeof raw?.currencyCode === "string" && raw.currencyCode.trim()
      ? raw.currencyCode.trim().toUpperCase().slice(0, 8)
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
  const status = error?.status ?? error?.code ?? error?.error?.code ?? error?.error?.status;
  const message = String(error?.message || error || "");
  const combined = `${status} ${message}`.toUpperCase();
  if (status === 429 || combined.includes("RESOURCE_EXHAUSTED")) {
    throw new Error("QUOTA");
  }
  if (
    status === 401 ||
    status === 403 ||
    combined.includes("API_KEY_INVALID") ||
    combined.includes("INVALID_API_KEY") ||
    combined.includes("PERMISSION_DENIED")
  ) {
    throw new Error("BAD_KEY");
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
          role: "user",
          parts: [{ text: PROMPT }, { inlineData: { mimeType, data } }],
        },
      ],
      config: {
        responseMimeType: "application/json",
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
    throw new Error("UNREADABLE");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("UNREADABLE");
  }

  return normalizeScan(parsed);
}
