export const dynamic = "force-dynamic";

import { jsonSuccess } from "../../../../lib/response.js";
import { clearSessionCookie } from "../../../../lib/auth.js";

export async function POST() {
  const response = jsonSuccess("Logged out successfully");
  return clearSessionCookie(response);
}
