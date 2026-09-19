import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSnapshotReadback } from "../../src/lib/transaction-readback";
import type { MarketSnapshot } from "../../src/lib/types";

const expected: MarketSnapshot = {
  snapshotId: "a".repeat(64), marketKey: "k".repeat(64), version: 0,
  platform: "polymarket", platformMarketId: "market-1", sourceUrl: "https://polymarket.com/market/market-1",
  title: "Market 1", description: "Rules", outcomes: ["Yes", "No"], resolutionRules: "Rules",
  resolutionSource: "https://example.com/source", openTime: "2026-01-01", closeTime: "2026-12-31",
  resolutionDeadline: "", clarifications: "", retrievedAt: "2026-09-10T00:00:00Z", sourceHash: "b".repeat(64),
  normalizedFacts: {}, canonicalEventHint: "", providerLabel: "Polymarket Gamma API", authority: "offchain-preview",
};

function actual() {
  return {
    snapshot_id: expected.snapshotId, platform: expected.platform, platform_market_id: expected.platformMarketId,
    source_url: expected.sourceUrl, title: expected.title, description: expected.description,
    resolution_rules: expected.resolutionRules, resolution_source: expected.resolutionSource,
    open_time: expected.openTime, close_time: expected.closeTime, resolution_deadline: expected.resolutionDeadline,
    clarifications: expected.clarifications, retrieved_at: expected.retrievedAt, source_hash: expected.sourceHash,
    canonical_event_hint: expected.canonicalEventHint, source_evidence_hash: "e".repeat(64), outcomes: expected.outcomes, version: 1,
  };
}

test("snapshot read-back accepts the expected finalized record", () => {
  assert.equal(assertSnapshotReadback(actual(), expected).snapshot_id, expected.snapshotId);
});

test("snapshot read-back rejects a mismatched source hash", () => {
  assert.throws(() => assertSnapshotReadback({ ...actual(), source_hash: "c".repeat(64) }, expected), /source_hash/);
});
