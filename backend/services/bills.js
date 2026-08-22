import { query, toInt } from "../lib/db.js";
import { calculateBillTotals } from "../lib/calculations.js";

function mapCurrency(row) {
  return {
    id: toInt(row.CurrencyId),
    code: row.currencyCode,
    name: row.currencyName,
    symbol: row.currencySymbol,
    decimalPlaces: toInt(row.decimalPlaces),
  };
}

export function mapItem(row) {
  return {
    id: toInt(row.ItemId),
    name: row.itemName,
    price: toInt(row.itemPrice),
    quantity: toInt(row.itemQuantity),
    notes: row.itemNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapBill(row, items = [], { isOwner = false, includeShareToken = false } = {}) {
  const charges = {
    discount: toInt(row.billDiscount),
    discountType: row.billDiscountType,
    discountTiming: row.billDiscountTiming,
    service: toInt(row.billService),
    tax: toInt(row.billTax),
  };
  const mappedItems = items.map(mapItem);
  const totals = calculateBillTotals(mappedItems, charges);

  const bill = {
    id: toInt(row.BillId),
    title: row.billTitle,
    restaurantName: row.billRestaurantName || null,
    ownerId: toInt(row.BillUserId),
    isOwner,
    currency: mapCurrency(row),
    items: mappedItems,
    charges,
    totals,
    createdAt: row.BillCreatedAt,
    updatedAt: row.BillUpdatedAt,
  };

  if (includeShareToken) {
    bill.shareToken = row.billShareToken || null;
  }

  return bill;
}

export async function currencyExists(currencyId, db = { query }) {
  const result = await db.query(
    `SELECT "CurrencyId" FROM "Currencies" WHERE "CurrencyId" = $1`,
    [currencyId]
  );
  return result.rowCount > 0;
}

export async function listCurrencies(db = { query }) {
  const result = await db.query(
    `SELECT "CurrencyId", "currencyCode", "currencyName", "currencySymbol", "decimalPlaces"
     FROM "Currencies"
     ORDER BY "CurrencyId" ASC`
  );
  return result.rows.map(mapCurrency);
}

export async function getBillRowById(billId, db = { query }) {
  const result = await db.query(
    `SELECT
       b."BillId", b."BillUserId", b."billTitle", b."billRestaurantName", b."billTax", b."billService",
       b."billDiscount", b."billDiscountType", b."billDiscountTiming",
       b."billShareToken", b."BillCurrencyFKId", b."BillCreatedAt", b."BillUpdatedAt",
       c."CurrencyId", c."currencyCode", c."currencyName", c."currencySymbol", c."decimalPlaces"
     FROM "Bills" b
     INNER JOIN "Currencies" c ON c."CurrencyId" = b."BillCurrencyFKId"
     WHERE b."BillId" = $1`,
    [billId]
  );
  return result.rows[0] || null;
}

export async function getBillRowByShareToken(shareToken, db = { query }) {
  const result = await db.query(
    `SELECT
       b."BillId", b."BillUserId", b."billTitle", b."billRestaurantName", b."billTax", b."billService",
       b."billDiscount", b."billDiscountType", b."billDiscountTiming",
       b."billShareToken", b."BillCurrencyFKId", b."BillCreatedAt", b."BillUpdatedAt",
       c."CurrencyId", c."currencyCode", c."currencyName", c."currencySymbol", c."decimalPlaces"
     FROM "Bills" b
     INNER JOIN "Currencies" c ON c."CurrencyId" = b."BillCurrencyFKId"
     WHERE b."billShareToken" = $1`,
    [shareToken]
  );
  return result.rows[0] || null;
}

export async function listItemsForBill(billId, db = { query }) {
  const result = await db.query(
    `SELECT "ItemId", "itemName", "itemQuantity", "itemPrice", "itemNotes",
            "ItemBillId", "createdAt", "updatedAt"
     FROM "Items"
     WHERE "ItemBillId" = $1
     ORDER BY "createdAt" ASC, "ItemId" ASC`,
    [billId]
  );
  return result.rows;
}

export async function userCanViewBill(billId, userId, db = { query }) {
  const result = await db.query(
    `SELECT
       b."BillUserId" AS owner_id,
       EXISTS (
         SELECT 1 FROM "BillAccess" a
         WHERE a."BillAccessBillId" = b."BillId" AND a."BillAccessUserId" = $2
       ) AS has_access
     FROM "Bills" b
     WHERE b."BillId" = $1`,
    [billId, userId]
  );
  if (result.rowCount === 0) return { found: false, canView: false, isOwner: false };
  const ownerId = toInt(result.rows[0].owner_id);
  const isOwner = ownerId === userId;
  const hasAccess = result.rows[0].has_access === true;
  return { found: true, canView: isOwner || hasAccess, isOwner };
}

export async function listAccessibleBills(
  userId,
  {
    page,
    limit,
    scope = "owned",
    search = "",
    restaurant = "",
    month = null,
    year = null,
    sort = "desc",
  },
  db = { query }
) {
  const offset = (page - 1) * limit;
  const ownedOnly = scope !== "saved";
  const order = sort === "asc" ? "ASC" : "DESC";

  const conditions = [];
  const params = [userId];

  if (ownedOnly) {
    conditions.push(`b."BillUserId" = $1`);
  } else {
    conditions.push(`EXISTS (
         SELECT 1 FROM "BillAccess" a
         WHERE a."BillAccessBillId" = b."BillId" AND a."BillAccessUserId" = $1
       )
       AND b."BillUserId" <> $1`);
  }

  const accessWhere = conditions.join(" AND ");

  if (search) {
    params.push(`%${escapeIlike(search)}%`);
    conditions.push(`b."billTitle" ILIKE $${params.length} ESCAPE '\\'`);
  }
  if (restaurant) {
    params.push(restaurant);
    conditions.push(`b."billRestaurantName" = $${params.length}`);
  }
  if (month) {
    params.push(month);
    conditions.push(`EXTRACT(MONTH FROM b."BillCreatedAt") = $${params.length}`);
  }
  if (year) {
    params.push(year);
    conditions.push(`EXTRACT(YEAR FROM b."BillCreatedAt") = $${params.length}`);
  }

  const where = conditions.join(" AND ");

  const [countResult, yearsResult, restaurantsResult, listResult] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS total
       FROM "Bills" b
       WHERE ${where}`,
      params
    ),
    db.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM b."BillCreatedAt")::int AS year
       FROM "Bills" b
       WHERE ${accessWhere}
       ORDER BY year DESC`,
      [userId]
    ),
    db.query(
      `SELECT DISTINCT b."billRestaurantName" AS "restaurantName"
       FROM "Bills" b
       WHERE ${accessWhere}
         AND b."billRestaurantName" IS NOT NULL
         AND LENGTH(TRIM(b."billRestaurantName")) > 0
       ORDER BY b."billRestaurantName" ASC`,
      [userId]
    ),
    db.query(
      `SELECT
         b."BillId", b."BillUserId", b."billTitle", b."billRestaurantName", b."billTax", b."billService",
         b."billDiscount", b."billDiscountType", b."billDiscountTiming",
         b."billShareToken", b."BillCurrencyFKId", b."BillCreatedAt", b."BillUpdatedAt",
         c."CurrencyId", c."currencyCode", c."currencyName", c."currencySymbol", c."decimalPlaces",
         u."username" AS "ownerUsername",
         COALESCE(SUM(i."itemPrice" * i."itemQuantity"), 0) AS subtotal,
         (b."BillUserId" = $1) AS "isOwner"
       FROM "Bills" b
       INNER JOIN "Currencies" c ON c."CurrencyId" = b."BillCurrencyFKId"
       INNER JOIN "Users" u ON u."UserId" = b."BillUserId"
       LEFT JOIN "Items" i ON i."ItemBillId" = b."BillId"
       WHERE ${where}
       GROUP BY b."BillId", c."CurrencyId", u."UserId"
       ORDER BY b."BillCreatedAt" ${order}, b."BillId" ${order}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const bills = listResult.rows.map((row) => {
    const charges = {
      discount: toInt(row.billDiscount),
      discountType: row.billDiscountType,
      discountTiming: row.billDiscountTiming,
      service: toInt(row.billService),
      tax: toInt(row.billTax),
    };
    const subtotal = toInt(row.subtotal);
    const totals = calculateBillTotals([{ price: subtotal, quantity: 1 }], charges);
    return {
      id: toInt(row.BillId),
      title: row.billTitle,
      restaurantName: row.billRestaurantName || null,
      ownerId: toInt(row.BillUserId),
      ownerUsername: row.ownerUsername || null,
      isOwner: row.isOwner === true,
      currency: mapCurrency(row),
      charges,
      totals: {
        ...totals,
        subtotal,
      },
      createdAt: row.BillCreatedAt,
      updatedAt: row.BillUpdatedAt,
    };
  });

  return {
    bills,
    page,
    limit,
    total: toInt(countResult.rows[0].total),
    years: yearsResult.rows.map((row) => toInt(row.year)).filter((value) => value > 0),
    restaurants: restaurantsResult.rows
      .map((row) => row.restaurantName)
      .filter((value) => typeof value === "string" && value.trim()),
  };
}

function escapeIlike(value) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function insertBill(data, userId, db = { query }) {
  const result = await db.query(
    `INSERT INTO "Bills" (
       "BillUserId", "billTitle", "billRestaurantName", "billTax", "billService", "billDiscount",
       "billDiscountType", "billDiscountTiming", "BillCurrencyFKId"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING "BillId"`,
    [
      userId,
      data.title,
      data.restaurantName,
      data.tax,
      data.service,
      data.discount,
      data.discountType,
      data.discountTiming,
      data.currencyId,
    ]
  );
  return toInt(result.rows[0].BillId);
}

export async function updateBill(billId, data, db = { query }) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    title: '"billTitle"',
    restaurantName: '"billRestaurantName"',
    tax: '"billTax"',
    service: '"billService"',
    discount: '"billDiscount"',
    discountType: '"billDiscountType"',
    discountTiming: '"billDiscountTiming"',
    currencyId: '"BillCurrencyFKId"',
    shareToken: '"billShareToken"',
  };

  for (const [key, column] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${column} = $${i}`);
      values.push(data[key]);
      i += 1;
    }
  }

  if (fields.length === 0) return;

  fields.push(`"BillUpdatedAt" = CURRENT_TIMESTAMP`);
  values.push(billId);
  await db.query(
    `UPDATE "Bills" SET ${fields.join(", ")} WHERE "BillId" = $${i}`,
    values
  );
}

export async function deleteBill(billId, db = { query }) {
  const result = await db.query(`DELETE FROM "Bills" WHERE "BillId" = $1`, [billId]);
  return result.rowCount > 0;
}

export async function insertItem(billId, item, db = { query }) {
  const result = await db.query(
    `INSERT INTO "Items" ("itemName", "itemQuantity", "itemPrice", "itemNotes", "ItemBillId")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING "ItemId", "itemName", "itemQuantity", "itemPrice", "itemNotes",
               "ItemBillId", "createdAt", "updatedAt"`,
    [item.name, item.quantity, item.price, item.notes ?? null, billId]
  );
  return mapItem(result.rows[0]);
}

export async function getItemById(itemId, db = { query }) {
  const result = await db.query(
    `SELECT i."ItemId", i."itemName", i."itemQuantity", i."itemPrice", i."itemNotes",
            i."ItemBillId", i."createdAt", i."updatedAt", b."BillUserId"
     FROM "Items" i
     INNER JOIN "Bills" b ON b."BillId" = i."ItemBillId"
     WHERE i."ItemId" = $1`,
    [itemId]
  );
  return result.rows[0] || null;
}

export async function updateItem(itemId, data, db = { query }) {
  const fields = [];
  const values = [];
  let i = 1;
  const map = {
    name: '"itemName"',
    quantity: '"itemQuantity"',
    price: '"itemPrice"',
    notes: '"itemNotes"',
  };
  for (const [key, column] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${column} = $${i}`);
      values.push(data[key]);
      i += 1;
    }
  }
  if (fields.length === 0) return;
  fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
  values.push(itemId);
  const result = await db.query(
    `UPDATE "Items" SET ${fields.join(", ")}
     WHERE "ItemId" = $${i}
     RETURNING "ItemId", "itemName", "itemQuantity", "itemPrice", "itemNotes",
               "ItemBillId", "createdAt", "updatedAt"`,
    values
  );
  return result.rows[0] ? mapItem(result.rows[0]) : null;
}

export async function deleteItem(itemId, db = { query }) {
  const result = await db.query(`DELETE FROM "Items" WHERE "ItemId" = $1`, [itemId]);
  return result.rowCount > 0;
}

export async function deleteItemsNotIn(billId, keepIds, db = { query }) {
  if (keepIds.length === 0) {
    await db.query(`DELETE FROM "Items" WHERE "ItemBillId" = $1`, [billId]);
    return;
  }
  await db.query(
    `DELETE FROM "Items"
     WHERE "ItemBillId" = $1 AND NOT ("ItemId" = ANY($2::int[]))`,
    [billId, keepIds]
  );
}

export async function replaceBillItems(billId, items, db) {
  const keepIds = [];
  const saved = [];

  for (const item of items) {
    if (item.id) {
      const existing = await getItemById(item.id, db);
      if (!existing || toInt(existing.ItemBillId) !== billId) {
        const created = await insertItem(billId, item, db);
        saved.push(created);
        keepIds.push(created.id);
      } else {
        const updated = await updateItem(item.id, item, db);
        saved.push(updated);
        keepIds.push(item.id);
      }
    } else {
      const created = await insertItem(billId, item, db);
      saved.push(created);
      keepIds.push(created.id);
    }
  }

  await deleteItemsNotIn(billId, keepIds, db);
  return saved;
}
