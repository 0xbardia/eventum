import { z } from "zod";
import { getConfig } from "./config";
import { ContractError } from "./genlayer";
import { log } from "./logger";
import { ProviderError } from "./providers/polymarket";

const globalRate = globalThis as unknown as { eventumRate?: Map<string, { count: number; resetAt: number }> };

function rateMap() {
  globalRate.eventumRate ??= new Map();
  return globalRate.eventumRate;
}

function rateKeys(request: Request, scope: string): string[] {
  const real = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = real || forwarded || "unknown";
  const keys = [`${scope}:ip:${address}`];
  const session = request.headers.get("cookie")?.match(/(?:^|;\s*)eventum_session=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
  if (session) keys.push(`${scope}:session:${session}`);
  return keys;
}

export function rateLimit(request: Request, scope = "read"): boolean {
  const config = getConfig();
  const now = Date.now();
  const keys = rateKeys(request, scope);
  const buckets = keys.map((key) => rateMap().get(key));
  if (buckets.some((current) => current && current.resetAt > now && current.count >= config.RATE_LIMIT_MAX)) return false;
  for (const key of keys) {
    const current = rateMap().get(key);
    if (!current || current.resetAt <= now) rateMap().set(key, { count: 1, resetAt: now + config.RATE_LIMIT_WINDOW_MS });
    else current.count += 1;
  }
  return true;
}

function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  const expected = canonicalOrigin(getConfig().APP_URL);
  if (!origin || !expected || canonicalOrigin(origin) !== expected) {
    throw new ApiError("CROSS_ORIGIN_REQUEST", "The request origin is not allowed.", 403);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const maxBytes = getConfig().MAX_REQUEST_BODY_BYTES;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiError("REQUEST_TOO_LARGE", "The request body is too large.", 413);
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          try { await reader.cancel(); } catch { /* request already closed */ }
          throw new ApiError("REQUEST_TOO_LARGE", "The request body is too large.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("INVALID_JSON", "The request body must be valid JSON.", 400);
  }
}

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "ApiError";
  }
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError("INVALID_REQUEST", result.error.issues.map((issue) => issue.message).join("; "), 400);
  }
  return result.data;
}

export function response(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function rateLimitResponse(request: Request, scope = "read"): Response | null {
  if (rateLimit(request, scope)) return null;
  return withApiHeaders(response({ error: { code: "RATE_LIMITED", message: "Too many requests; try again shortly." } }, 429));
}

export function errorResponse(error: unknown) {
  const safe =
    error instanceof ApiError || error instanceof ProviderError || error instanceof ContractError
      ? error
      : new ApiError("INTERNAL_ERROR", "Eventum could not complete the request.", 500);
  if (safe.status >= 500) log("error", safe.message, { code: safe.code, status: safe.status });
  return response({ error: { code: safe.code, message: safe.message } }, safe.status);
}

export function withApiHeaders(responseValue: Response) {
  responseValue.headers.set("X-Content-Type-Options", "nosniff");
  responseValue.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return responseValue;
}
