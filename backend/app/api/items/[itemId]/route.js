export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../../lib/response.js";
import { requireAuth } from "../../../../lib/auth.js";
import { parseItemPayload } from "../../../../lib/validate.js";
import { toInt } from "../../../../lib/db.js";
import { deleteItem, getItemById, updateItem } from "../../../../services/bills.js";

function parseId(params) {
  const id = Number(params.itemId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function PATCH(request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const itemId = parseId(params);
    if (!itemId) return jsonError("Item not found", 404);

    const existing = await getItemById(itemId);
    if (!existing) return jsonError("Item not found", 404);
    if (toInt(existing.BillUserId) !== user.id) return jsonError("Forbidden", 403);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Request body must be a JSON object", 400);
    }

    const parsed = parseItemPayload(body, { partial: true });
    if (parsed.error) return jsonError(parsed.error, 400);

    const item = await updateItem(itemId, parsed.value);
    return jsonSuccess("Item updated successfully", { item });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const itemId = parseId(params);
    if (!itemId) return jsonError("Item not found", 404);

    const existing = await getItemById(itemId);
    if (!existing) return jsonError("Item not found", 404);
    if (toInt(existing.BillUserId) !== user.id) return jsonError("Forbidden", 403);

    await deleteItem(itemId);
    return jsonSuccess("Item deleted successfully");
  } catch (error) {
    return handleError(error);
  }
}
