import type { MarketSnapshot } from "./types";

export function parseContractJson(value: unknown): Record<string, unknown> {
  if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
  return value as Record<string, unknown>;
}

export function assertSnapshotReadback(value: unknown, expected: MarketSnapshot): Record<string, unknown> {
  const actual = parseContractJson(value);
  if (!actual || Array.isArray(actual) || typeof actual !== "object") throw new Error("The registered snapshot read-back was invalid.");
  const item = actual as Record<string, unknown>;
  const expectedFields: Array<[string, string]> = [
    ["snapshot_id", expected.snapshotId],
    ["platform", expected.platform],
    ["platform_market_id", expected.platformMarketId],
    ["source_url", expected.sourceUrl],
    ["title", expected.title],
    ["description", expected.description],
    ["resolution_rules", expected.resolutionRules],
    ["resolution_source", expected.resolutionSource],
    ["open_time", expected.openTime],
    ["close_time", expected.closeTime],
    ["resolution_deadline", expected.resolutionDeadline],
    ["clarifications", expected.clarifications],
    ["retrieved_at", expected.retrievedAt],
    ["source_hash", expected.sourceHash],
    ["canonical_event_hint", expected.canonicalEventHint],
  ];
  for (const [field, expectedValue] of expectedFields) {
    if (String(item[field] ?? "") !== expectedValue) throw new Error(`Snapshot read-back mismatch: ${field}.`);
  }
  if (!Array.isArray(item.outcomes) || JSON.stringify(item.outcomes.map(String)) !== JSON.stringify(expected.outcomes)) {
    throw new Error("Snapshot read-back mismatch: outcomes.");
  }
  if (!Number.isInteger(Number(item.version)) || Number(item.version) < 1) throw new Error("Snapshot read-back mismatch: version.");
  return item;
}
