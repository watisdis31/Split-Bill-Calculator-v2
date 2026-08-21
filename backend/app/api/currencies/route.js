export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../lib/response.js";
import { listCurrencies } from "../../../services/bills.js";

export async function GET() {
  try {
    const currencies = await listCurrencies();
    return jsonSuccess("Currencies retrieved", { currencies });
  } catch (error) {
    return handleError(error);
  }
}
