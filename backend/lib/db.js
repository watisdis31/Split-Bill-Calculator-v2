import pg from "pg";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";
const isServerless = Boolean(process.env.VERCEL);
const connectionString = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");

const pool = new Pool({
  connectionString,
  ssl:
    isProduction || connectionString.includes("supabase")
      ? { rejectUnauthorized: false }
      : undefined,
  // Keep connection count low on Vercel serverless; use Supabase pooler in DATABASE_URL.
  ...(isServerless
    ? { max: 1, idleTimeoutMillis: 5000, allowExitOnIdle: true }
    : {}),
});

export function query(text, params) {
  return pool.query(text, params);
}

export function getClient() {
  return pool.connect();
}

export { pool };

export function toInt(value) {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
