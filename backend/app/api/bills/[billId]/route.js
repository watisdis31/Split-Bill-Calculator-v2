export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../../lib/response.js";
import { requireAuth } from "../../../../lib/auth.js";
import { parseBillPayload, parseItemPayload } from "../../../../lib/validate.js";
import { toInt, withTransaction } from "../../../../lib/db.js";
import {
  currencyExists,
  deleteBill,
  getBillRowById,
  listItemsForBill,
  mapBill,
  replaceBillItems,
  updateBill,
  userCanViewBill,
} from "../../../../services/bills.js";

function parseId(params) {
  const id = Number(params.billId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function GET(_request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const billId = parseId(params);
    if (!billId) return jsonError("Bill not found", 404);

    const access = await userCanViewBill(billId, user.id);
    if (!access.found) return jsonError("Bill not found", 404);
    if (!access.canView) return jsonError("Forbidden", 403);

    const row = await getBillRowById(billId);
    const items = await listItemsForBill(billId);
    const bill = mapBill(row, items, {
      isOwner: access.isOwner,
      includeShareToken: access.isOwner,
    });

    return jsonSuccess("Bill retrieved", { bill });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const billId = parseId(params);
    if (!billId) return jsonError("Bill not found", 404);

    const access = await userCanViewBill(billId, user.id);
    if (!access.found) return jsonError("Bill not found", 404);
    if (!access.isOwner) return jsonError("Forbidden", 403);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Request body must be a JSON object", 400);
    }

    const parsed = parseBillPayload(body, { partial: true });
    if (parsed.error) return jsonError(parsed.error, 400);

    if (parsed.value.currencyId !== undefined) {
      const exists = await currencyExists(parsed.value.currencyId);
      if (!exists) return jsonError("Currency not found", 400);
    }

    let parsedItems = null;
    if (Array.isArray(body.items)) {
      parsedItems = [];
      for (const raw of body.items) {
        const item = parseItemPayload(raw);
        if (item.error) return jsonError(item.error, 400);
        if (raw.id !== undefined && raw.id !== null) {
          const id = toInt(raw.id);
          if (id < 1) return jsonError("Invalid item id", 400);
          item.value.id = id;
        }
        parsedItems.push(item.value);
      }
    }

    await withTransaction(async (client) => {
      await updateBill(billId, parsed.value, client);
      if (parsedItems) {
        await replaceBillItems(billId, parsedItems, client);
      }
    });

    const row = await getBillRowById(billId);
    const items = await listItemsForBill(billId);
    const bill = mapBill(row, items, { isOwner: true, includeShareToken: true });

    return jsonSuccess("Bill updated successfully", { bill });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const billId = parseId(params);
    if (!billId) return jsonError("Bill not found", 404);

    const access = await userCanViewBill(billId, user.id);
    if (!access.found) return jsonError("Bill not found", 404);
    if (!access.isOwner) return jsonError("Forbidden", 403);

    await deleteBill(billId);
    return jsonSuccess("Bill deleted successfully");
  } catch (error) {
    return handleError(error);
  }
}
