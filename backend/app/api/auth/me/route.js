export const dynamic = "force-dynamic";

import { jsonError, jsonSuccess, handleError } from "../../../../lib/response.js";
import { getSessionUser, publicUser } from "../../../../lib/auth.js";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }
    return jsonSuccess("Authenticated", { user: publicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}
