export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../../../lib/response.js";
import { requireAuth } from "../../../../../lib/auth.js";
import { parseItemPayload } from "../../../../../lib/validate.js";
import { insertItem, userCanViewBill } from "../../../../../services/bills.js";

function parseId(params) {
  const id = Number(params.billId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function POST(request, { params }) {
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

    const parsed = parseItemPayload(body);
    if (parsed.error) return jsonError(parsed.error, 400);

    const item = await insertItem(billId, parsed.value);
    return jsonSuccess("Item added successfully", { item }, 201);
  } catch (error) {
    return handleError(error);
  }
}
