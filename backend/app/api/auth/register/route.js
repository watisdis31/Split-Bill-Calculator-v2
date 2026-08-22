export const dynamic = "force-dynamic";

import bcrypt from "bcryptjs";
import { jsonError, jsonSuccess, handleError } from "../../../../lib/response.js";
import { parseUsername, parsePassword } from "../../../../lib/validate.js";
import { createUser, findUserByUsername } from "../../../../services/users.js";
import {
  createSessionToken,
  publicUser,
  setSessionCookie,
} from "../../../../lib/auth.js";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Request body must be a JSON object", 400);
    }

    const username = parseUsername(body.username);
    if (username.error) return jsonError(username.error, 400);

    const password = parsePassword(body.password);
    if (password.error) return jsonError(password.error, 400);

    const existing = await findUserByUsername(username.value);
    if (existing) {
      return jsonError("Username is already taken", 409);
    }

    const passwordHash = await bcrypt.hash(password.value, 10);
    const user = await createUser({
      username: username.value,
      passwordHash,
    });

    const response = jsonSuccess("Account created successfully", { user: publicUser(user) }, 201);
    return setSessionCookie(response, createSessionToken({ UserId: user.id, username: user.username }));
  } catch (error) {
    if (error && error.code === "23505") {
      return jsonError("Username is already taken", 409);
    }
    return handleError(error);
  }
}
