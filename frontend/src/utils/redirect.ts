export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return null;
  }
  const pathname = value.split(/[?#]/, 1)[0];
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }
  return value;
}
