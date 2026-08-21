export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../../lib/response.js";
import { getSessionUser } from "../../../../lib/auth.js";
import { toInt } from "../../../../lib/db.js";
import {
  getBillRowByShareToken,
  listItemsForBill,
  mapBill,
} from "../../../../services/bills.js";
import { hasAccess } from "../../../../services/access.js";

export async function GET(_request, { params }) {
  try {
    const shareToken = params.shareToken;
    if (!shareToken || typeof shareToken !== "string" || shareToken.length < 8) {
      return jsonError("Bill not found", 404);
    }

    const row = await getBillRowByShareToken(shareToken);
    if (!row) return jsonError("Bill not found", 404);

    const user = await getSessionUser();
    const ownerId = toInt(row.BillUserId);
    const isOwner = Boolean(user && user.id === ownerId);
    const isSaved = Boolean(user && !isOwner && (await hasAccess(toInt(row.BillId), user.id)));

    const items = await listItemsForBill(row.BillId);
    const bill = mapBill(row, items, { isOwner, includeShareToken: false });
    delete bill.ownerId;

    return jsonSuccess("Shared bill retrieved", {
      bill,
      access: { isOwner, isSaved },
    });
  } catch (error) {
    return handleError(error);
  }
}
