import { NextResponse } from "next/server";

const ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type";

function applyCors(request, response) {
  const origin = request.headers.get("origin");
  const allowed = process.env.FRONTEND_URL || "http://localhost:5173";

  if (origin && origin === allowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export function middleware(request) {
  if (request.method === "OPTIONS") {
    return applyCors(request, new NextResponse(null, { status: 204 }));
  }
  return applyCors(request, NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
