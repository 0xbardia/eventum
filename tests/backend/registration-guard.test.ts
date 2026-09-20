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

test("browser mutation routes reject a foreign origin while non-browser clients remain usable", () => {
  assert.throws(
    () => assertSameOrigin(new Request("http://localhost/api/comparisons/runs", { headers: { origin: "https://evil.example" } })),
    /origin is not allowed/,
  );
  assert.doesNotThrow(() => assertSameOrigin(new Request("http://localhost/api/comparisons/runs", { headers: { origin: "http://localhost" } })));
  assert.doesNotThrow(() => assertSameOrigin(new Request("http://localhost/api/comparisons/runs")));
});
