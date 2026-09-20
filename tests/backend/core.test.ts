import assert from "node:assert/strict";
import "./test-env";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { errorResponse, parseBody, rateLimit, rateLimitResponse, readJson } from "../../src/lib/api";
import { getConfig } from "../../src/lib/config";
import { dbHealth, predictedSnapshotId, registerArgs, snapshotIdentityPayload } from "../../src/lib/db";
import { canonicalJson, sha256 } from "../../src/lib/hash";
import { assertPublicHost, canonicalEventHintFromParent, parsePolymarketUrl, resolvePolymarket } from "../../src/lib/providers/polymarket";
import { createComparisonRunSchema, prepareComparisonSchema, resolveMarketSchema } from "../../src/lib/schemas";

test("canonical JSON is deterministic and sorted", () => {
  assert.equal(canonicalJson({ z: 1, a: { d: true, c: null } }), '{"a":{"c":null,"d":true},"z":1}');
});

test("Polymarket URL resolver accepts exact market paths and canonicalizes harmless suffixes", () => {
  const eventSlug = "what-price-will-bitcoin-hit-in-september-2026";
  const marketSlug = "will-bitcoin-dip-to-80k-in-september-2026";
  assert.deepEqual(parsePolymarketUrl("https://www.polymarket.com/market/example-market"), {
    kind: "market",
    slug: "example-market",
    canonicalUrl: "https://polymarket.com/market/example-market",
  });
  assert.deepEqual(parsePolymarketUrl(`https://polymarket.com/event/${eventSlug}/${marketSlug}/?utm_source=test#details`), {
    kind: "event",
    slug: marketSlug,
    eventSlug,
    canonicalUrl: `https://polymarket.com/event/${eventSlug}/${marketSlug}`,
  });
  assert.deepEqual(parsePolymarketUrl("https://polymarket.com/event/example-event"), {
    kind: "event",
    slug: "example-event",
    canonicalUrl: "https://polymarket.com/event/example-event",
  });
  assert.throws(() => parsePolymarketUrl("https://polymarket.com/event/example-event" + "/".repeat(2)), /Enter a valid Polymarket/);
  assert.throws(() => parsePolymarketUrl("http://polymarket.com/market/example-market"), /Only HTTPS public Polymarket/);
  assert.throws(() => parsePolymarketUrl("https://polymarket.com.evil.com/market/example-market"), /Only HTTPS public Polymarket/);
  assert.throws(() => parsePolymarketUrl("https://evil.com/polymarket.com/market/example-market"), /Only HTTPS public Polymarket/);
  assert.throws(() => parsePolymarketUrl("https://user:pass@polymarket.com/market/example-market"), /canonical Polymarket URL/);
  assert.throws(() => parsePolymarketUrl("https://polymarket.com/event/example-event/market/extra"), /Enter a valid Polymarket/);
  assert.throws(() => parsePolymarketUrl("https://polymarket.com/event/example-event/%E0%A4%A"), /Enter a valid Polymarket/);
  assert.throws(() => parsePolymarketUrl("https://polymarket.com/event//example-market"), /Enter a valid Polymarket/);
});

test("nested event URLs resolve the exact Gamma child market", async () => {
  const eventSlug = "what-price-will-bitcoin-hit-in-september-2026";
  const marketA = "will-bitcoin-dip-to-80k-in-september-2026";
  const marketB = "will-bitcoin-dip-to-77pt5k-in-september-2026-from-september-3";
  const payloads = new Map([
    [marketA, { id: "4190830", slug: marketA, question: "Will Bitcoin dip to $80,000 in September?", description: "Rules for the $80,000 child market.", outcomes: '["Yes","No"]', events: [{ id: "946004", slug: eventSlug, title: "What price will Bitcoin hit in September?" }] }],
    [marketB, { id: "4190831", slug: marketB, question: "Will Bitcoin dip to $77,500 in September?", description: "Rules for the $77,500 child market.", outcomes: '["Yes","No"]', events: [{ id: "946004", slug: eventSlug, title: "What price will Bitcoin hit in September?" }] }],
  ]);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input) => {
      const slug = decodeURIComponent(new URL(String(input)).pathname.split("/").at(-1) || "");
      const payload = payloads.get(slug);
      return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const [resolvedA, resolvedB] = await Promise.all([
      resolvePolymarket(`https://polymarket.com/event/${eventSlug}/${marketA}/?utm_source=test`),
      resolvePolymarket(`https://polymarket.com/event/${eventSlug}/${marketB}`),
    ]);
    assert.equal(resolvedA.platformMarketId, "4190830");
    assert.equal(resolvedB.platformMarketId, "4190831");
    assert.notEqual(resolvedA.platformMarketId, resolvedB.platformMarketId);
    assert.equal(resolvedA.sourceUrl, `https://polymarket.com/event/${eventSlug}/${marketA}`);
    assert.equal(resolvedB.sourceUrl, `https://polymarket.com/event/${eventSlug}/${marketB}`);
    assert.match(resolvedA.title, /80,000/);
    assert.match(resolvedB.title, /77,500/);
    assert.equal(resolvedA.normalizedFacts.event_slug, eventSlug);
    assert.equal(resolvedB.normalizedFacts.event_slug, eventSlug);
    assert.equal(resolvedA.canonicalEventHint, "polymarket:event:946004");
    assert.equal(resolvedB.canonicalEventHint, resolvedA.canonicalEventHint);

    globalThis.fetch = (async () => new Response(JSON.stringify({ ...payloads.get(marketA), events: [{ slug: "different-event" }] }), { headers: { "content-type": "application/json" } })) as typeof fetch;
    await assert.rejects(
      () => resolvePolymarket(`https://polymarket.com/event/${eventSlug}/${marketA}`),
      /not part of that event/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Gamma registration times use authoritative startDate/endDate, not ISO display fields", async () => {
  const payload = {
    id: "4052421",
    slug: "will-bitcoin-reach-80k-in-september-2026",
    question: "Will Bitcoin reach $80,000 in September?",
    description: "Resolve from the published Binance rules.",
    outcomes: '["Yes","No"]',
    resolutionSource: "",
    startDate: "2026-09-01T05:07:17Z",
    startDateIso: "2026-09-01",
    endDate: "2026-10-01T04:00:00Z",
    endDateIso: "2026-10-01",
    events: [{ id: "946004", slug: "what-price-will-bitcoin-hit-in-september-2026", title: "What price will Bitcoin hit in September?" }],
  };
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } })) as typeof fetch;
    const evidence = await resolvePolymarket("https://polymarket.com/market/will-bitcoin-reach-80k-in-september-2026");
    const args = registerArgs(evidence);
    assert.notEqual(payload.startDate, payload.startDateIso);
    assert.notEqual(payload.endDate, payload.endDateIso);
    assert.equal(evidence.openTime, payload.startDate);
    assert.equal(evidence.closeTime, payload.endDate);
    assert.deepEqual({ open_time: args[8], close_time: args[9] }, { open_time: payload.startDate, close_time: payload.endDate });
    assert.equal(evidence.canonicalEventHint, "polymarket:event:946004");
    assert.equal(evidence.sourceHash, sha256(canonicalJson(payload)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("missing authoritative Gamma times stay empty instead of using ISO fallbacks", async () => {
  const payload = {
    id: "4052422",
    slug: "missing-authoritative-times",
    question: "A market with incomplete dates",
    description: "Resolve from the published rules.",
    outcomes: '["Yes","No"]',
    startDateIso: "2026-09-01",
    endDateIso: "2026-10-01",
  };
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } })) as typeof fetch;
    const evidence = await resolvePolymarket("https://polymarket.com/market/missing-authoritative-times");
    const args = registerArgs(evidence);
    assert.equal(evidence.openTime, "");
    assert.equal(evidence.closeTime, "");
    assert.equal(args[8], "");
    assert.equal(args[9], "");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider host checks reject SSRF targets before DNS access", async () => {
  await assert.rejects(() => assertPublicHost("localhost", ["localhost"]), /not public/);
  await assert.rejects(() => assertPublicHost("127.0.0.1", ["127.0.0.1"]), /Private or special/);
  await assert.rejects(() => assertPublicHost("169.254.169.254", ["169.254.169.254"]), /Private or special/);
  await assert.rejects(() => assertPublicHost("::ffff:172.16.0.1", ["::ffff:172.16.0.1"]), /Private or special/);
  await assert.rejects(() => assertPublicHost("evil.example", ["gamma-api.polymarket.com"]), /Only verified Polymarket/);
});

test("request bodies are schema-checked and size-limited", async () => {
  const request = new Request("http://localhost/api/markets/resolve", {
    method: "POST",
    body: JSON.stringify({ url: "https://polymarket.com/market/example-market" }),
  });
  const body = parseBody(resolveMarketSchema, await readJson(request));
  assert.equal(body.url, "https://polymarket.com/market/example-market");
  assert.throws(() => parseBody(resolveMarketSchema, { url: body.url, extra: true }), /Unrecognized key/);
  assert.throws(() => parseBody(prepareComparisonSchema, { urls: ["only-one"] }), /exactly 2/);
  await assert.rejects(
    () => readJson(new Request("http://localhost", { method: "POST", body: "{" })),
    /valid JSON/,
  );
  await assert.rejects(
    () => readJson(new Request("http://localhost", { method: "POST", body: "x".repeat(64 * 1024 + 1) })),
    /too large/,
  );
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(64 * 1024 + 1))); },
    cancel() { cancelled = true; },
  });
  const streamRequestInit = { method: "POST", body: stream, duplex: "half" } as RequestInit & { duplex: "half" };
  await assert.rejects(
    () => readJson(new Request("http://localhost", streamRequestInit)),
    /too large/,
  );
  assert.equal(cancelled, true);
});

test("comparison runs accept version-zero offchain previews and reject them as onchain", () => {
  const snapshot = {
    snapshotId: "a".repeat(64),
    marketKey: "b".repeat(64),
    version: 0,
    platform: "polymarket" as const,
    platformMarketId: "4190830",
    sourceUrl: "https://polymarket.com/market/example-market",
    title: "Example market",
    description: "Published rules.",
    outcomes: ["Yes", "No"],
    resolutionRules: "Resolve from the published source.",
    resolutionSource: "https://example.com/source",
    openTime: "2026-01-01T00:00:00Z",
    closeTime: "2026-12-31T23:59:59Z",
    resolutionDeadline: "2027-01-07T00:00:00Z",
    clarifications: "",
    retrievedAt: "2026-09-11T00:00:00Z",
    sourceHash: "c".repeat(64),
    normalizedFacts: { actor: "Bitcoin" },
    canonicalEventHint: "",
    providerLabel: "Polymarket Gamma API" as const,
    authority: "offchain-preview" as const,
  };
  const body = createComparisonRunSchema.parse({
    snapshotAId: snapshot.snapshotId,
    snapshotBId: snapshot.snapshotId,
    comparisonVersion: "1.0.0",
    snapshots: [snapshot, { ...snapshot, platformMarketId: "4190831" }],
    registerArgs: [Array.from({ length: 16 }, () => "arg"), Array.from({ length: 16 }, () => "arg")],
  });
  assert.equal(body.snapshots[0].version, 0);
  assert.throws(
    () => createComparisonRunSchema.parse({ ...body, snapshots: body.snapshots.map((item) => ({ ...item, authority: "onchain" })) }),
    /Onchain snapshots must use version >= 1/,
  );
});

test("file cache persists previews without leaking raw provider payloads", async () => {
  const cacheDirectory = mkdtempSync(join(tmpdir(), "eventum-cache-test-"));
  process.env.APP_ENV = "test";
  process.env.DATABASE_PATH = join(cacheDirectory, "cache.json");
  const { getStoredMarket, storeMarketPreview } = await import("../../src/lib/db");
  const evidence = {
    platform: "polymarket" as const,
    platformMarketId: "test-market",
    sourceUrl: "https://polymarket.com/market/test-market",
    title: "A test market",
    description: "Published rules",
    outcomes: ["Yes", "No"],
    resolutionRules: "Resolve from the official source.",
    resolutionSource: "https://example.com/source",
    openTime: "2026-01-01T00:00:00Z",
    closeTime: "2026-12-31T23:59:59Z",
    resolutionDeadline: "2027-01-07T00:00:00Z",
    clarifications: "",
    retrievedAt: "2026-09-08T00:00:00Z",
    sourceHash: "a".repeat(64),
    normalizedFacts: { actor: "Example" },
    canonicalEventHint: "",
    providerLabel: "Polymarket Gamma API" as const,
    rawPayload: { secretInternalField: true },
  };
  const stored = storeMarketPreview(evidence);
  assert.equal(stored.authority, "offchain-preview");
  assert.equal("rawPayload" in stored, false);
  const restored = getStoredMarket(stored.snapshotId);
  assert.equal(restored?.title, "A test market");
  assert.equal("rawPayload" in (restored ?? {}), false);
  const persisted = JSON.parse(readFileSync(join(cacheDirectory, "cache.json"), "utf8")) as { schemaVersion: string };
  assert.equal(persisted.schemaVersion, "001_initial");
});

test("provider boundary rejects HTML, malformed JSON, bad shapes, redirects, and outages", async () => {
  const originalFetch = globalThis.fetch;
  const goodUrl = "https://polymarket.com/market/example-market";
  const goodPayload = { id: "1", question: "Example?", description: "Resolve from the official source.", outcomes: '["Yes","No"]', slug: "example-market" };
  try {
    globalThis.fetch = (async () => new Response("<html>not json</html>", { headers: { "content-type": "text/html" } })) as typeof fetch;
    await assert.rejects(() => resolvePolymarket(goodUrl), /did not return JSON/);

    globalThis.fetch = (async () => new Response("{", { headers: { "content-type": "application/json" } })) as typeof fetch;
    await assert.rejects(() => resolvePolymarket(goodUrl), /malformed JSON/);

    globalThis.fetch = (async () => new Response(JSON.stringify({ id: "1", question: "Example?" }), { headers: { "content-type": "application/json" } })) as typeof fetch;
    await assert.rejects(() => resolvePolymarket(goodUrl), /enough rules/);

    globalThis.fetch = (async () => new Response(JSON.stringify({ ...goodPayload, outcomes: "not-json" }), { headers: { "content-type": "application/json" } })) as typeof fetch;
    await assert.rejects(() => resolvePolymarket(goodUrl), /invalid outcome list/);

    globalThis.fetch = (async () => new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } })) as typeof fetch;
    await assert.rejects(() => resolvePolymarket(goodUrl), /verified API host/);

    globalThis.fetch = (async () => { throw new Error("provider offline"); }) as typeof fetch;
    await assert.rejects(() => resolvePolymarket(goodUrl), /could not be reached/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider byte limit, rate limit, config, cache, and safe errors fail closed", async () => {
  const originalMax = process.env.FETCH_MAX_BYTES;
  const originalRateMax = process.env.RATE_LIMIT_MAX;
  const originalRateWindow = process.env.RATE_LIMIT_WINDOW_MS;
  const originalAddress = process.env.GENLAYER_CONTRACT_ADDRESS;
  const originalEnv = process.env.APP_ENV;
  const originalAppUrl = process.env.APP_URL;
  const originalDatabasePath = process.env.DATABASE_PATH;
  const originalFetch = globalThis.fetch;
  try {
    process.env.FETCH_MAX_BYTES = "10";
    globalThis.fetch = (async () => new Response(JSON.stringify({ too: "large" }), { headers: { "content-type": "application/json" } })) as typeof fetch;
    await assert.rejects(() => resolvePolymarket("https://polymarket.com/market/example-market"), /exceeded the safety limit/);

    process.env.RATE_LIMIT_MAX = "1";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    const first = new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.10" } });
    const second = new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.10" } });
    assert.equal(rateLimit(first), true);
    assert.equal(rateLimit(second), false);
    const forwardedSpoof = new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.10", "x-forwarded-for": "203.0.113.20" } });
    assert.equal(rateLimit(forwardedSpoof), false);
    const limited = rateLimitResponse(new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.10" } }));
    assert.equal(limited?.status, 429);

    process.env.APP_ENV = "production";
    process.env.APP_URL = "https://eventum.bydx.fun";
    process.env.GENLAYER_CONTRACT_ADDRESS = "not-an-address";
    assert.throws(() => getConfig(), /production|required|address/);

    process.env.APP_ENV = "test";
    process.env.GENLAYER_CONTRACT_ADDRESS = originalAddress || "";
    process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "eventum-cache-directory-"));
    assert.throws(() => dbHealth(), /directory|EISDIR/);

    const body = await errorResponse(new Error("sensitive implementation detail")).json() as { error: { message: string } };
    assert.equal(body.error.message, "Eventum could not complete the request.");
    assert.equal(JSON.stringify(body).includes("sensitive implementation detail"), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of [["FETCH_MAX_BYTES", originalMax], ["RATE_LIMIT_MAX", originalRateMax], ["RATE_LIMIT_WINDOW_MS", originalRateWindow], ["GENLAYER_CONTRACT_ADDRESS", originalAddress], ["APP_ENV", originalEnv], ["APP_URL", originalAppUrl], ["DATABASE_PATH", originalDatabasePath]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("canonical event hint is parent-backed and never fabricated", () => {
  assert.equal(canonicalEventHintFromParent({ id: "946004", slug: "what-price-will-bitcoin-hit-in-september-2026" }), "polymarket:event:946004");
  assert.equal(canonicalEventHintFromParent({ slug: "parent-event-slug" }), "polymarket:event:parent-event-slug");
  assert.equal(canonicalEventHintFromParent({ id: "946004" }), canonicalEventHintFromParent({ id: "946004", slug: "ignored-when-id-present" }));
  assert.equal(canonicalEventHintFromParent({ id: "111" }), "polymarket:event:111");
  assert.notEqual(canonicalEventHintFromParent({ id: "111" }), canonicalEventHintFromParent({ id: "222" }));
  assert.equal(canonicalEventHintFromParent(undefined), "");
  assert.equal(canonicalEventHintFromParent({ id: "", slug: "" }), "");
});

test("snapshot identity ignores retrieved_at and volume but reacts to material settlement changes", () => {
  const evidence = {
    platform: "polymarket" as const,
    platformMarketId: "4190830",
    sourceUrl: "https://polymarket.com/market/example-market",
    title: "Will Bitcoin dip to $80,000 in September?",
    description: "Resolve from Binance 1m lows.",
    outcomes: ["Yes", "No"],
    resolutionRules: "Resolve from Binance 1m lows.",
    resolutionSource: "https://www.binance.com/en/trade/BTC_USDT",
    openTime: "2026-09-03",
    closeTime: "2026-10-01",
    resolutionDeadline: "",
    clarifications: "",
    retrievedAt: "2026-09-10T00:00:00Z",
    sourceHash: "a".repeat(64),
    normalizedFacts: { volume: 100, liquidity: 50 },
    canonicalEventHint: "polymarket:event:946004",
    providerLabel: "Polymarket Gamma API" as const,
    rawPayload: { volume: 100 },
  };
  const identity = snapshotIdentityPayload(evidence);
  assert.equal("retrieved_at" in identity, false);
  assert.equal("source_hash" in identity, false);
  assert.equal("normalized_facts" in identity, false);
  const t1 = predictedSnapshotId(evidence);
  const t2 = predictedSnapshotId({ ...evidence, retrievedAt: "2026-09-19T12:00:00Z", sourceHash: "b".repeat(64), normalizedFacts: { volume: 999, liquidity: 1 }, rawPayload: { volume: 999 } });
  assert.equal(t1, t2);
  assert.notEqual(t1, predictedSnapshotId({ ...evidence, title: "Will Bitcoin dip to $77,500 in September?" }));
  assert.notEqual(t1, predictedSnapshotId({ ...evidence, outcomes: ["Yes", "No", "Invalid"] }));
  assert.notEqual(t1, predictedSnapshotId({ ...evidence, resolutionSource: "https://example.com/other-source" }));
  assert.notEqual(t1, predictedSnapshotId({ ...evidence, resolutionRules: "Different resolution rule." }));
});
