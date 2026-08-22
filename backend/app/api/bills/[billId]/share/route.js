export const dynamic = "force-dynamic";

import crypto from "crypto";
import { jsonError, jsonSuccess, handleError } from "../../../../../lib/response.js";
import { requireAuth } from "../../../../../lib/auth.js";
import {
  getBillRowById,
  listItemsForBill,
  mapBill,
  updateBill,
  userCanViewBill,
} from "../../../../../services/bills.js";

function parseId(params) {
  const id = Number(params.billId);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

function buildShareUrl(token) {
  const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${frontend}/bill/s/${token}`;
}

export async function POST(_request, { params }) {
  try {
    const { user, unauthorized } = await requireAuth();
    if (unauthorized) return jsonError("Unauthorized", 401);

    const billId = parseId(params);
    if (!billId) return jsonError("Bill not found", 404);

    const access = await userCanViewBill(billId, user.id);
    if (!access.found) return jsonError("Bill not found", 404);
    if (!access.isOwner) return jsonError("Forbidden", 403);

    const existing = await getBillRowById(billId);
    let token = existing.billShareToken;

    if (!token) {
      token = crypto.randomBytes(16).toString("base64url");
      await updateBill(billId, { shareToken: token });
    }

    const row = await getBillRowById(billId);
    const items = await listItemsForBill(billId);
    const bill = mapBill(row, items, { isOwner: true, includeShareToken: true });

    return jsonSuccess("Share link generated", {
      shareToken: token,
      shareUrl: buildShareUrl(token),
      bill,
    });
  } catch (error) {
    return handleError(error);
  }
}
