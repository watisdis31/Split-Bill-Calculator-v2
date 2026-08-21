export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../../../lib/response.js";
import { requireAuth } from "../../../../../lib/auth.js";
import { userCanViewBill } from "../../../../../services/bills.js";
import { removeOwnAccess } from "../../../../../services/access.js";

function parseId(params) {
  const id = Number(params.billId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function DELETE(_request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const billId = parseId(params);
    if (!billId) return jsonError("Bill not found", 404);

    const access = await userCanViewBill(billId, user.id);
    if (!access.found) return jsonError("Bill not found", 404);
    if (access.isOwner) {
      return jsonError("Owners cannot remove their own bill this way", 400);
    }
    if (!access.canView) return jsonError("Forbidden", 403);

    await removeOwnAccess(billId, user.id);
    return jsonSuccess("Bill removed from your saved bills.", {
      access: { isOwner: false, isSaved: false },
    });
  } catch (error) {
    return handleError(error);
  }
}
