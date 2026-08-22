export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../../../lib/response.js";
import { requireAuth } from "../../../../../lib/auth.js";
import { toInt } from "../../../../../lib/db.js";
import { getBillRowByShareToken } from "../../../../../services/bills.js";
import { hasAccess, removeOwnAccess, saveAccess } from "../../../../../services/access.js";

function parseToken(params) {
  const shareToken = params.shareToken;
  if (!shareToken || typeof shareToken !== "string" || shareToken.length < 8) return null;
  return shareToken;
}

export async function POST(_request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const shareToken = parseToken(params);
    if (!shareToken) return jsonError("Bill not found", 404);

    const row = await getBillRowByShareToken(shareToken);
    if (!row) return jsonError("Bill not found", 404);

    const billId = toInt(row.BillId);
    const ownerId = toInt(row.BillUserId);

    if (user.id === ownerId) {
      return jsonSuccess("This is your bill.", {
        access: { isOwner: true, isSaved: false },
      });
    }

    if (await hasAccess(billId, user.id)) {
      return jsonSuccess("Bill is already saved to your account.", {
        access: { isOwner: false, isSaved: true },
      });
    }

    try {
      await saveAccess(billId, user.id);
    } catch (error) {
      if (error && error.code === "23505") {
        return jsonSuccess("Bill is already saved to your account.", {
          access: { isOwner: false, isSaved: true },
        });
      }
      throw error;
    }

    return jsonSuccess("Bill saved to your account.", {
      access: { isOwner: false, isSaved: true },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const shareToken = parseToken(params);
    if (!shareToken) return jsonError("Bill not found", 404);

    const row = await getBillRowByShareToken(shareToken);
    if (!row) return jsonError("Bill not found", 404);

    const billId = toInt(row.BillId);
    const ownerId = toInt(row.BillUserId);

    if (user.id === ownerId) {
      return jsonError("Owners cannot remove their own bill this way", 400);
    }

    const removed = await removeOwnAccess(billId, user.id);
    if (!removed) {
      return jsonSuccess("Bill is not in your saved bills.", {
        access: { isOwner: false, isSaved: false },
      });
    }

    return jsonSuccess("Bill removed from your saved bills.", {
      access: { isOwner: false, isSaved: false },
    });
  } catch (error) {
    return handleError(error);
  }
}
