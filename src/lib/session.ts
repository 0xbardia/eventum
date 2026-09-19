import { createHash, randomBytes } from "node:crypto";
import { getConfig } from "./config";

export const SESSION_COOKIE = "eventum_session";

function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  const value = match?.slice(SESSION_COOKIE.length + 1) || "";
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

export function sessionHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function getSession(request: Request, create = false): { hash: string; setCookie?: string } | null {
  const existing = cookieValue(request);
  if (existing) return { hash: sessionHash(existing) };
  if (!create) return null;
  const value = randomBytes(32).toString("base64url");
  const secure = getConfig().APP_ENV === "production" ? "; Secure" : "";
  return {
    hash: sessionHash(value),
    setCookie: `${SESSION_COOKIE}=${value}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict${secure}`,
  };
}
