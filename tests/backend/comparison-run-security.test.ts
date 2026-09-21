import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import "./test-env";
import { GET, PATCH } from "../../app/api/comparisons/runs/[id]/route";
import { POST } from "../../app/api/comparisons/runs/route";
import { getComparisonRun, getComparisonRunRecord } from "../../src/lib/db";
import { validateTransactionClaim } from "../../src/lib/run-reconciliation";

const contract = "0x96F23489C251135965b13303A991b2B9579bdF19";

function snapshot(id: string, marketId: string) {
  return {
    snapshotId: id,
    marketKey: "b".repeat(64),
    version: 0,
    platform: "polymarket" as const,
    platformMarketId: marketId,
    sourceUrl: `https://polymarket.com/market/${marketId}`,
    title: `Market ${marketId}`,
    description: "Published rules.",
    outcomes: ["Yes", "No"],
    resolutionRules: "Resolve from the published source.",
    resolutionSource: "",
    openTime: "2026-01-01T00:00:00Z",
    closeTime: "2026-12-31T00:00:00Z",
    resolutionDeadline: "",
    clarifications: "",
    retrievedAt: "2026-09-19T00:00:00Z",
    sourceHash: "a".repeat(64),
    normalizedFacts: {},
    canonicalEventHint: "polymarket:event:test",
    providerLabel: "Polymarket Gamma API" as const,
    authority: "offchain-preview" as const,
  };
}

function body() {
  const a = snapshot("1".repeat(64), "market-a");
  const b = snapshot("2".repeat(64), "market-b");
  return {
    snapshotAId: a.snapshotId,
    snapshotBId: b.snapshotId,
    comparisonVersion: "1.0.0",
    snapshots: [a, b],
    registerArgs: [Array.from({ length: 16 }, (_, index) => index === 13 ? a.sourceHash : `a-${index}`), Array.from({ length: 16 }, (_, index) => index === 13 ? b.sourceHash : `b-${index}`)],
  };
}

function cookie(response: Response): string {
  return (response.headers.get("set-cookie") || "").split(";", 1)[0];
}

async function create(ip: string) {
  const response = await POST(new Request("http://localhost/api/comparisons/runs", { method: "POST", headers: { origin: "http://127.0.0.1:4187", "x-real-ip": ip, "content-type": "application/json" }, body: JSON.stringify(body()) }));
  assert.equal(response.status, 201);
  return { run: (await response.clone().json() as { run: { runId: string } }).run, cookie: cookie(response) };
}

test("comparison run mutations require the owning session and reject forged chain fields", async () => {
  process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "eventum-security-")), "cache.json");
  process.env.GENLAYER_CONTRACT_ADDRESS = contract;
  const unauthenticated = await PATCH(new Request("http://localhost/api/comparisons/runs/random", { method: "PATCH", headers: { origin: "http://127.0.0.1:4187", "content-type": "application/json", "x-real-ip": "198.51.100.41" }, body: JSON.stringify({ comparisonTx: `0x${"a".repeat(64)}` }) }), { params: Promise.resolve({ id: "random" }) });
  assert.equal(unauthenticated.status, 401);

  const first = await create("198.51.100.42");
  const second = await create("198.51.100.43");
  const crossSession = await PATCH(new Request(`http://localhost/api/comparisons/runs/${first.run.runId}`, { method: "PATCH", headers: { origin: "http://127.0.0.1:4187", cookie: second.cookie, "content-type": "application/json", "x-real-ip": "198.51.100.44" }, body: JSON.stringify({ comparisonTx: `0x${"b".repeat(64)}` }) }), { params: Promise.resolve({ id: first.run.runId }) });
  assert.equal(crossSession.status, 403);

  const random = await PATCH(new Request("http://localhost/api/comparisons/runs/missing", { method: "PATCH", headers: { origin: "http://127.0.0.1:4187", cookie: first.cookie, "content-type": "application/json", "x-real-ip": "198.51.100.45" }, body: JSON.stringify({ comparisonTx: `0x${"c".repeat(64)}` }) }), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(random.status, 404);

  const forged = await PATCH(new Request(`http://localhost/api/comparisons/runs/${first.run.runId}`, { method: "PATCH", headers: { origin: "http://127.0.0.1:4187", cookie: first.cookie, "content-type": "application/json", "x-real-ip": "198.51.100.46" }, body: JSON.stringify({ persistedOnchain: true, relation: "EQUIVALENT", consensusOutcome: "MAJORITY_AGREE" }) }), { params: Promise.resolve({ id: first.run.runId }) });
  assert.equal(forged.status, 400);
  assert.equal(getComparisonRun(first.run.runId)?.persistedOnchain, false);
  const publicRun = await GET(new Request(`http://localhost/api/comparisons/runs/${first.run.runId}`, { headers: { "x-real-ip": "198.51.100.47" } }), { params: Promise.resolve({ id: first.run.runId }) });
  assert.equal(publicRun.status, 200);
  assert.equal("ownerSessionHash" in (await publicRun.json()).run, false);
});

test("historical runs remain readable but read-only and transaction binding rejects a wrong contract", async () => {
  process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "eventum-history-")), "cache.json");
  process.env.GENLAYER_CONTRACT_ADDRESS = contract;
  const historical = await create("198.51.100.48");
  const record = getComparisonRunRecord(historical.run.runId)!;
  delete record.ownerSessionHash;
  const read = await GET(new Request(`http://localhost/api/comparisons/runs/${historical.run.runId}`, { headers: { "x-real-ip": "198.51.100.49" } }), { params: Promise.resolve({ id: historical.run.runId }) });
  assert.equal(read.status, 200);
  const write = await PATCH(new Request(`http://localhost/api/comparisons/runs/${historical.run.runId}`, { method: "PATCH", headers: { origin: "http://127.0.0.1:4187", cookie: historical.cookie, "content-type": "application/json", "x-real-ip": "198.51.100.50" }, body: JSON.stringify({ comparisonTx: `0x${"d".repeat(64)}` }) }), { params: Promise.resolve({ id: historical.run.runId }) });
  assert.equal(write.status, 403);

  assert.throws(() => validateTransactionClaim({ recipient: "0x1111111111111111111111111111111111111111" }, record, "comparison"), /different Eventum contract/);
  assert.doesNotThrow(() => validateTransactionClaim({ recipient: contract, chainId: 61999, txDataDecoded: { callData: { method: "compare_markets", args: [record.snapshotAId, record.snapshotBId, record.comparisonVersion] } } }, record, "comparison"));
});
