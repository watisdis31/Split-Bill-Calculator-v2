import type { Currency } from "../types";

export function formatMoney(minorUnits: number, currency: Currency): string {
  const amount = Number(minorUnits) || 0;
  if (currency.decimalPlaces === 0) {
    const formatted = new Intl.NumberFormat("id-ID").format(amount);
    return `${currency.symbol} ${formatted}`;
  }

  const major = amount / 10 ** currency.decimalPlaces;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  }).format(major);
  return `${currency.symbol}${formatted}`;
}

export function minorToInput(minorUnits: number, decimalPlaces: number): string {
  if (decimalPlaces === 0) return String(minorUnits || 0);
  const pow = 10 ** decimalPlaces;
  const whole = Math.trunc((minorUnits || 0) / pow);
  const frac = String(Math.abs((minorUnits || 0) % pow)).padStart(decimalPlaces, "0");
  return `${whole}.${frac}`;
}

export function parseMoneyInput(
  raw: string,
  decimalPlaces: number,
  { allowZero = false } = {}
): number | null {
  const cleaned = raw.trim().replace(/,/g, "").replace(/\s/g, "");
  if (!cleaned) return allowZero ? 0 : null;

  if (decimalPlaces === 0) {
    if (!/^\d+$/.test(cleaned)) return null;
    const n = Number(cleaned);
    if (!Number.isInteger(n) || n < 0) return null;
    if (!allowZero && n <= 0) return null;
    return n;
  }

  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  if (frac.length > decimalPlaces) return null;
  const fracPadded = (frac + "0".repeat(decimalPlaces)).slice(0, decimalPlaces);
  const minor = Number(whole) * 10 ** decimalPlaces + Number(fracPadded);
  if (!Number.isInteger(minor) || minor < 0) return null;
  if (!allowZero && minor <= 0) return null;
  return minor;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
