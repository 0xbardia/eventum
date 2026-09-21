import assert from "node:assert/strict";
import { test } from "node:test";
import "./test-env";
import { assertSameOrigin, rateLimit, rateLimitResponse } from "../../src/lib/api";
import { isMissingSnapshotError, registrationAction } from "../../src/lib/registration-guard";

test("registration bursts are throttled without consuming the read-only bucket", () => {
  const previousMax = process.env.RATE_LIMIT_MAX;
  try {
    process.env.RATE_LIMIT_MAX = "1";
    const request = (ip: string) => new Request("http://localhost/api/comparisons/runs", { headers: { "x-real-ip": ip } });
    assert.equal(rateLimit(request("198.51.100.201"), "registration"), true);
    assert.equal(rateLimitResponse(request("198.51.100.201"), "registration")?.status, 429);
    assert.equal(rateLimit(request("198.51.100.201"), "read"), true);
  } finally {
    if (previousMax === undefined) delete process.env.RATE_LIMIT_MAX;
    else process.env.RATE_LIMIT_MAX = previousMax;
  }
});

test("registration decisions dedupe exact snapshots and allow different markets", () => {
  assert.equal(registrationAction({ sourceHash: "A" }, "a"), "skip");
  assert.equal(registrationAction({ sourceHash: "A" }, "b"), "write");
  assert.equal(registrationAction("missing", "a"), "write");
});

test("temporary verification failure never becomes a duplicate write", () => {
  assert.equal(isMissingSnapshotError(new Error("MARKET_NOT_FOUND")), true);
  assert.equal(isMissingSnapshotError(new Error("RPC rate limit exceeded")), false);
  assert.equal(registrationAction("unavailable", "a"), "wait");
});

test("browser mutation routes use APP_URL as the proxy-safe origin authority", () => {
  const previousAppUrl = process.env.APP_URL;
  const request = (origin: string, headers: Record<string, string> = {}) => new Request("http://127.0.0.1:4187/api/comparisons/runs", { headers: { origin, ...headers } });
  try {
    process.env.APP_URL = "https://eventum.bydx.fun";
    assert.doesNotThrow(() => assertSameOrigin(request("https://eventum.bydx.fun")));
    assert.doesNotThrow(() => assertSameOrigin(request("https://eventum.bydx.fun:443")));
    assert.doesNotThrow(() => assertSameOrigin(request("https://eventum.bydx.fun", { "x-forwarded-host": "eventum.bydx.fun", "x-forwarded-proto": "https" })));
    for (const origin of [
      "http://eventum.bydx.fun",
      "https://eventum.bydx.fun.attacker.com",
      "https://evil.eventum.bydx.fun",
      "https://example.com",
      "https://attacker.com",
    ]) {
      assert.throws(() => assertSameOrigin(request(origin, { "x-forwarded-host": "eventum.bydx.fun", "x-forwarded-proto": "https" })), /origin is not allowed/);
    }
    assert.throws(() => assertSameOrigin(new Request("http://127.0.0.1:4187/api/comparisons/runs")), /origin is not allowed/);
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
  }
});
