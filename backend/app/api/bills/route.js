export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../lib/response.js";
import { requireAuth } from "../../../lib/auth.js";
import { parseBillPayload, parseItemPayload, parseBillListQuery } from "../../../lib/validate.js";
import { withTransaction } from "../../../lib/db.js";
import {
  currencyExists,
  insertBill,
  insertItem,
  listAccessibleBills,
  getBillRowById,
  listItemsForBill,
  mapBill,
} from "../../../services/bills.js";

export async function GET(request) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const listQuery = parseBillListQuery(searchParams);
    const scope = searchParams.get("scope") === "saved" ? "saved" : "owned";
    const result = await listAccessibleBills(user.id, { ...listQuery, scope });
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit) || 1);

    return jsonSuccess("Bills retrieved", {
      bills: result.bills,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages,
      hasPreviousPage: result.page > 1,
      hasNextPage: result.page < totalPages && result.total > 0,
      years: result.years,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Request body must be a JSON object", 400);
    }

    const parsed = parseBillPayload(body);
    if (parsed.error) return jsonError(parsed.error, 400);

    const exists = await currencyExists(parsed.value.currencyId);
    if (!exists) return jsonError("Currency not found", 400);

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = [];
    for (const raw of rawItems) {
      const item = parseItemPayload(raw);
      if (item.error) return jsonError(item.error, 400);
      items.push(item.value);
    }

    const billId = await withTransaction(async (client) => {
      const id = await insertBill(parsed.value, user.id, client);
      for (const item of items) {
        await insertItem(id, item, client);
      }
      return id;
    });

    const row = await getBillRowById(billId);
    const savedItems = await listItemsForBill(billId);
    const bill = mapBill(row, savedItems, { isOwner: true, includeShareToken: true });

    return jsonSuccess("Bill created successfully", { bill }, 201);
  } catch (error) {
    return handleError(error);
  }
}
