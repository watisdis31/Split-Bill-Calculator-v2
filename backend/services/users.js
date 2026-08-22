import { query, toInt } from "../lib/db.js";

export async function findUserByUsername(username, db = { query }) {
  const result = await db.query(
    `SELECT "UserId", "username", "userPassword", "createdAt", "updatedAt"
     FROM "Users"
     WHERE LOWER("username") = LOWER($1)`,
    [username]
  );
  return result.rows[0] || null;
}

export async function findUserById(userId, db = { query }) {
  const result = await db.query(
    `SELECT "UserId", "username", "createdAt", "updatedAt"
     FROM "Users"
     WHERE "UserId" = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function createUser({ username, passwordHash }, db = { query }) {
  const result = await db.query(
    `INSERT INTO "Users" ("username", "userPassword")
     VALUES ($1, $2)
     RETURNING "UserId", "username", "createdAt"`,
    [username, passwordHash]
  );
  const row = result.rows[0];
  return {
    id: toInt(row.UserId),
    username: row.username,
    createdAt: row.createdAt,
  };
}

export function mapUserRow(row) {
  if (!row) return null;
  return {
    id: toInt(row.UserId),
    username: row.username,
    createdAt: row.createdAt,
  };
}
