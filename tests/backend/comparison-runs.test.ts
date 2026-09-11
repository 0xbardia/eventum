import assert from "node:assert/strict";
import "./test-env";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createComparisonRun, getComparisonRun, updateComparisonRun } from "../../src/lib/db";

test("comparison runs persist independently with an append-only lifecycle", () => {
  const databasePath = join(mkdtempSync(join(tmpdir(), "eventum-runs-test-")), "cache.json");
  const previousPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = databasePath;
  try {
    const run = createComparisonRun({
      snapshotAId: "a".repeat(64),
      snapshotBId: "b".repeat(64),
      comparisonVersion: "1.0.0",
      contractAddress: "0x379A278bA5C13864f0354d40487F73B8A2B620c1",
      network: "studionet",
      chainId: 61999,
    });
    const updated = updateComparisonRun(run.runId, { comparisonTx: `0x${"c".repeat(64)}`, state: "SUBMITTED" }, { state: "SUBMITTED", at: new Date().toISOString(), detail: "Hash persisted." });
    assert.equal(getComparisonRun(run.runId)?.comparisonTx, `0x${"c".repeat(64)}`);
    assert.deepEqual(updated.events.map((event) => event.state), ["PREPARED", "SUBMITTED"]);
    const persisted = JSON.parse(readFileSync(databasePath, "utf8")) as { comparisonRuns: Record<string, { comparisonTx?: string; events: unknown[] }> };
    assert.equal(persisted.comparisonRuns[run.runId].comparisonTx, `0x${"c".repeat(64)}`);
    assert.equal(persisted.comparisonRuns[run.runId].events.length, 2);
    assert.equal(JSON.stringify(persisted).includes("private"), false);
  } finally {
    if (previousPath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousPath;
  }
});
