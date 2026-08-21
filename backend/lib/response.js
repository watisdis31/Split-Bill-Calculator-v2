import { NextResponse } from "next/server";

export function jsonSuccess(message, data = {}, status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function jsonError(message, status = 400, data = null) {
  const body = { success: false, message };
  if (data !== null) body.data = data;
  return NextResponse.json(body, { status });
}

export function handleError(error) {
  console.error(error);

  if (error && error.code === "23505") {
    return jsonError("Resource already exists", 409);
  }

  if (error && error.code === "23503") {
    return jsonError("Related record not found", 400);
  }

  if (error && error.code === "23514") {
    return jsonError("Validation failed", 400);
  }

  return jsonError("An unexpected error occurred", 500);
}
