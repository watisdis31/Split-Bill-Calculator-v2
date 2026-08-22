import crypto from "crypto";
import { cookies } from "next/headers";
import { query, toInt } from "./db.js";

const COOKIE_NAME = "esb_session";
const SESSION_DAYS = 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    // Cross-origin credentialed requests (Vercel frontend → Render API) require SameSite=None.
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function createSessionToken(user) {
  const payload = {
    userId: user.UserId,
    username: user.username,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || !payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, cookieOptions());
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}

export async function getSessionUser() {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const result = await query(
    `SELECT "UserId", "username", "createdAt"
     FROM "Users"
     WHERE "UserId" = $1`,
    [payload.userId]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    id: toInt(row.UserId),
    username: row.username,
    createdAt: row.createdAt,
  };
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, unauthorized: true };
  }
  return { user, unauthorized: false };
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt || null,
  };
}
