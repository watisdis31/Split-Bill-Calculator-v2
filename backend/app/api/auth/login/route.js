export const dynamic = "force-dynamic";

import bcrypt from "bcryptjs";
import { jsonError, jsonSuccess, handleError } from "../../../../lib/response.js";
import { parseUsername } from "../../../../lib/validate.js";
import { findUserByUsername } from "../../../../services/users.js";
import {
  createSessionToken,
  publicUser,
  setSessionCookie,
} from "../../../../lib/auth.js";

const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Request body must be a JSON object", 400);
    }

    const username = parseUsername(body.username);
    if (username.error) {
      return jsonError("Invalid username or password.", 401);
    }

    if (typeof body.password !== "string" || body.password.length === 0) {
      return jsonError("Invalid username or password.", 401);
    }

    const user = await findUserByUsername(username.value);
    const hash = user ? user.userPassword : DUMMY_HASH;
    let matches = false;
    try {
      matches = await bcrypt.compare(body.password, hash);
    } catch {
      matches = false;
    }

    if (!user || !matches) {
      return jsonError("Invalid username or password.", 401);
    }

    const publicData = publicUser({
      id: Number(user.UserId),
      username: user.username,
      createdAt: user.createdAt,
    });

    const response = jsonSuccess("Logged in successfully", { user: publicData });
    return setSessionCookie(
      response,
      createSessionToken({ UserId: publicData.id, username: publicData.username })
    );
  } catch (error) {
    return handleError(error);
  }
}
