import { query, toInt } from "../lib/db.js";

export async function hasAccess(billId, userId, db = { query }) {
  const result = await db.query(
    `SELECT 1
     FROM "BillAccess"
     WHERE "BillAccessBillId" = $1 AND "BillAccessUserId" = $2`,
    [billId, userId]
  );
  return result.rowCount > 0;
}

export async function saveAccess(billId, userId, db = { query }) {
  const result = await db.query(
    `INSERT INTO "BillAccess" ("BillAccessBillId", "BillAccessUserId")
     VALUES ($1, $2)
     RETURNING "BillAccessId", "BillAccessBillId", "BillAccessUserId", "createdAt"`,
    [billId, userId]
  );
  const row = result.rows[0];
  return {
    id: toInt(row.BillAccessId),
    billId: toInt(row.BillAccessBillId),
    userId: toInt(row.BillAccessUserId),
    createdAt: row.createdAt,
  };
}

export async function removeOwnAccess(billId, userId, db = { query }) {
  const result = await db.query(
    `DELETE FROM "BillAccess"
     WHERE "BillAccessBillId" = $1 AND "BillAccessUserId" = $2`,
    [billId, userId]
  );
  return result.rowCount > 0;
}
