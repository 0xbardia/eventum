import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import "./test-env";
import { createComparisonRun, getComparisonRun, updateComparisonRun } from "../../src/lib/db";
import { classifyTransaction } from "../../src/lib/transaction-status";
import { reconcileComparisonRun, rejectionExplanation } from "../../src/lib/run-reconciliation";

const contract = "0x96F23489C251135965b13303A991b2B9579bdF19";
const comparisonTx = `0x${"c".repeat(64)}`;

function createRun() {
  process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "eventum-reconcile-")), "cache.json");
  const snapshot = (id: string, marketId: string) => ({
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
  });
  const registerArgs = (sourceHash: string) => Array.from({ length: 16 }, (_, index) => index === 13 ? sourceHash : `arg-${index}`);
  return createComparisonRun({
    snapshotAId: "1".repeat(64),
    snapshotBId: "2".repeat(64),
    comparisonVersion: "1.0.0",
    snapshots: [snapshot("1".repeat(64), "market-a"), snapshot("2".repeat(64), "market-b")],
    registerArgs: [registerArgs("a".repeat(64)), registerArgs("b".repeat(64))],
    contractAddress: contract,
    network: "studionet",
    chainId: 61999,
  }, "owner-session-hash");
}

test("RPC reconciliation preserves one hash and never resubmits", async () => {
  const run = createRun();
  updateComparisonRun(run.runId, { comparisonTx, state: "SUBMITTED" });
  const initial = getComparisonRun(run.runId)!;
  process.env.GENLAYER_RPC_URL = "http://127.0.0.1:1";

  const first = await reconcileComparisonRun(run.runId);
  const second = await reconcileComparisonRun(run.runId);

  assert.equal(first.state, "RPC_UNAVAILABLE");
  assert.equal(second.state, "RPC_UNAVAILABLE");
  assert.equal(second.comparisonTx, comparisonTx);
  assert.equal(second.persistedOnchain, false);
  assert.equal(initial.comparisonTx, comparisonTx);
});

test("consensus rejection remains auditable and explains no onchain persistence", async () => {
  const run = createRun();
  const claim = getComparisonRun(run.runId)!;
  const stored = updateComparisonRun(run.runId, { comparisonTx, state: "SUBMITTED" });
  assert.equal(stored.comparisonTx, comparisonTx);
  const classification = classifyTransaction({
    status: 7,
    result: 7,
    consensus_data: { leader_receipt: [{ execution_result: "SUCCESS", result: { status: "return" } }] },
  });

  assert.equal(claim.persistedOnchain, false);
  assert.equal(classification.state, "consensus-error");
  assert.equal(rejectionExplanation("comparison"), "GenLayer validators did not accept the proposed semantic relationship, so no comparison was persisted onchain.");
});
