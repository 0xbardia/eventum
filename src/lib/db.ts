import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, resolve } from "node:path";
import { getConfig } from "./config";
import { canonicalJson, sha256 } from "./hash";
import type { Comparison, ComparisonRun, ComparisonRunEvent, MarketEvidence, MarketSnapshot } from "./types";

type PersistedCache = {
  schemaVersion: "001_initial";
  marketSources: Record<string, { displayName: string; adapterVersion: string }>;
  marketSnapshots: Record<string, { evidence: MarketEvidence; version: number }>;
  comparisonCache: Record<string, { comparison: Comparison; transactionHash?: string; updatedAt: string }>;
  transactions: Record<string, { operation: string; lifecycle: string; result?: unknown; errorCode?: string; updatedAt: string }>;
  comparisonRuns?: Record<string, StoredComparisonRun>;
};

export type StoredComparisonRun = ComparisonRun & { ownerSessionHash?: string };

const globalCache = globalThis as unknown as { eventumCache?: { path: string; data: PersistedCache } };

function databasePath(): string {
  const configured = getConfig().DATABASE_PATH;
  return isAbsolute(configured) ? configured : resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

function emptyCache(): PersistedCache {
  return {
    schemaVersion: "001_initial",
    marketSources: {
      polymarket: { displayName: "Polymarket", adapterVersion: "gamma-v1" },
    },
    marketSnapshots: {},
    comparisonCache: {},
    transactions: {},
    comparisonRuns: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseCache(raw: string, path: string): PersistedCache {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(`Eventum cache is not valid JSON: ${path}`);
  }
  if (!isRecord(value) || value.schemaVersion !== "001_initial" || !isRecord(value.marketSnapshots) || !isRecord(value.comparisonCache) || !isRecord(value.transactions)) {
    throw new Error(`Eventum cache has an unsupported schema: ${path}`);
  }
  const data = value as unknown as PersistedCache;
  data.comparisonRuns ??= {};
  return data;
}

function persist(path: string, data: PersistedCache) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(data)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
}

function getDb(): PersistedCache {
  const path = databasePath();
  if (globalCache.eventumCache?.path === path) return globalCache.eventumCache.data;
  const data = existsSync(path) ? parseCache(readFileSync(path, "utf8"), path) : emptyCache();
  if (!existsSync(path)) persist(path, data);
  globalCache.eventumCache = { path, data };
  return data;
}

function publicSnapshot(evidence: MarketEvidence, snapshotId: string, version: number): MarketSnapshot {
  const { rawPayload, ...publicEvidence } = evidence;
  void rawPayload;
  return {
    ...publicEvidence,
    snapshotId,
    version,
    marketKey: contractIdentity(evidence).market_key,
    authority: "offchain-preview",
  };
}

function publicRun(run: StoredComparisonRun): ComparisonRun {
  const { ownerSessionHash, ...visible } = run;
  void ownerSessionHash;
  return visible;
}

function contractIdentity(evidence: MarketEvidence) {
  return {
    market_key: sha256(`eventum:market:v1|${evidence.platform.toLowerCase()}|${evidence.platformMarketId}`),
    version: 0,
    platform: evidence.platform.toLowerCase(),
    platform_market_id: evidence.platformMarketId,
    source_url: evidence.sourceUrl,
    title: evidence.title,
    description: evidence.description,
    outcomes: evidence.outcomes,
    resolution_rules: evidence.resolutionRules,
    resolution_source: evidence.resolutionSource,
    open_time: evidence.openTime,
    close_time: evidence.closeTime,
    resolution_deadline: evidence.resolutionDeadline,
    clarifications: evidence.clarifications,
    retrieved_at: evidence.retrievedAt,
    source_hash: evidence.sourceHash.toLowerCase(),
    normalized_facts: evidence.normalizedFacts,
    canonical_event_hint: evidence.canonicalEventHint,
  };
}

/** Settlement-material identity only. Volatile retrieval metadata is excluded. */
export function snapshotIdentityPayload(evidence: MarketEvidence) {
  return {
    canonical_event_hint: evidence.canonicalEventHint,
    clarifications: evidence.clarifications,
    close_time: evidence.closeTime,
    description: evidence.description,
    open_time: evidence.openTime,
    outcomes: evidence.outcomes,
    platform: evidence.platform.toLowerCase(),
    platform_market_id: evidence.platformMarketId,
    resolution_deadline: evidence.resolutionDeadline,
    resolution_rules: evidence.resolutionRules,
    resolution_source: evidence.resolutionSource,
    source_url: evidence.sourceUrl,
    title: evidence.title,
  };
}

export function predictedSnapshotId(evidence: MarketEvidence): string {
  return sha256(`eventum:snapshot:v1|${canonicalJson(snapshotIdentityPayload(evidence))}`);
}

export function registerArgs(evidence: MarketEvidence): string[] {
  return [
    evidence.platform,
    evidence.platformMarketId,
    evidence.sourceUrl,
    evidence.title,
    evidence.description,
    JSON.stringify(evidence.outcomes),
    evidence.resolutionRules,
    evidence.resolutionSource,
    evidence.openTime,
    evidence.closeTime,
    evidence.resolutionDeadline,
    evidence.clarifications,
    evidence.retrievedAt,
    evidence.sourceHash,
    canonicalJson(evidence.normalizedFacts),
    evidence.canonicalEventHint,
  ];
}

export function storeMarketPreview(evidence: MarketEvidence): MarketSnapshot {
  const snapshotId = predictedSnapshotId(evidence);
  const cache = getDb();
  const existing = cache.marketSnapshots[snapshotId];
  const version = existing?.version ?? 0;
  if (!existing) {
    cache.marketSnapshots[snapshotId] = { evidence, version };
    persist(databasePath(), cache);
  }
  return publicSnapshot(existing?.evidence ?? evidence, snapshotId, version);
}

export function getStoredMarket(snapshotId: string): MarketSnapshot | null {
  const entry = getDb().marketSnapshots[snapshotId];
  return entry ? publicSnapshot(entry.evidence, snapshotId, entry.version) : null;
}

export function saveComparisonCache(comparison: Comparison, transactionHash?: string) {
  const now = new Date().toISOString();
  const cache = getDb();
  cache.comparisonCache[`${comparison.snapshotAId}|${comparison.snapshotBId}|${comparison.comparisonVersion}`] = {
    comparison,
    transactionHash,
    updatedAt: now,
  };
  persist(databasePath(), cache);
}

export function saveTransaction(hash: string, operation: string, lifecycle: string, result?: unknown, errorCode?: string) {
  const cache = getDb();
  cache.transactions[hash] = {
    operation,
    lifecycle,
    result,
    errorCode,
    updatedAt: new Date().toISOString(),
  };
  persist(databasePath(), cache);
}

export function createComparisonRun(input: Omit<ComparisonRun, "runId" | "createdAt" | "updatedAt" | "state" | "events" | "persistedOnchain"> & { state?: string; events?: ComparisonRunEvent[] }, ownerSessionHash?: string) {
  const now = new Date().toISOString();
  const run: StoredComparisonRun = {
    ...input,
    runId: randomUUID(),
    createdAt: now,
    updatedAt: now,
    state: input.state ?? "PREPARED",
    persistedOnchain: false,
    events: input.events ?? [{ state: input.state ?? "PREPARED", at: now }],
    ...(ownerSessionHash ? { ownerSessionHash } : {}),
  };
  const cache = getDb();
  cache.comparisonRuns ??= {};
  cache.comparisonRuns[run.runId] = run;
  persist(databasePath(), cache);
  return publicRun(run);
}

export function getComparisonRun(runId: string): ComparisonRun | null {
  const run = getDb().comparisonRuns?.[runId];
  return run ? publicRun(run) : null;
}

export function getComparisonRunRecord(runId: string): StoredComparisonRun | null {
  return getDb().comparisonRuns?.[runId] ?? null;
}

export function listComparisonRuns(): ComparisonRun[] {
  return Object.values(getDb().comparisonRuns ?? {}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(publicRun);
}

export function updateComparisonRun(runId: string, patch: Partial<ComparisonRun>, event?: ComparisonRunEvent): ComparisonRun {
  const cache = getDb();
  const current = cache.comparisonRuns?.[runId];
  if (!current) throw new Error("COMPARISON_RUN_NOT_FOUND");
  const updated: StoredComparisonRun = {
    ...current,
    ...patch,
    runId: current.runId,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    events: event ? [...current.events, event] : current.events,
  };
  cache.comparisonRuns![runId] = updated;
  persist(databasePath(), cache);
  return publicRun(updated);
}

// Historical forensic run from a superseded deployment; public and read-only.
export const FORENSIC_RUN_ID = "forensic-0x2a2777166e8ea1ef3c8d2c8090d3e49694f6efc5ceffe7f045e8a2d8126ffc87";

export function ensureForensicComparisonRun() {
  const existing = getComparisonRun(FORENSIC_RUN_ID);
  if (existing) return existing;
  const createdAt = "2026-09-11T03:28:26.677Z";
  const run: ComparisonRun = {
    runId: FORENSIC_RUN_ID,
    createdAt,
    updatedAt: createdAt,
    snapshotAId: "458f293a9cedea29f4f9d38b66d45861ae5058b2a637df1dbc82ebc8e2cdfc3c",
    snapshotBId: "abed644bc2550b3a9bf13cc9720583f36a325b6cea58acefab62d26a33dc6106",
    comparisonVersion: "1.0.0",
    contractAddress: "0x379A278bA5C13864f0354d40487F73B8A2B620c1",
    network: "studionet",
    chainId: 61999,
    comparisonTx: "0x2a2777166e8ea1ef3c8d2c8090d3e49694f6efc5ceffe7f045e8a2d8126ffc87",
    consensusOutcome: "MAJORITY_DISAGREE",
    leaderRelation: "CONFLICTING",
    executionResult: "FINISHED_WITH_RETURN",
    persistedOnchain: false,
    state: "MAJORITY_DISAGREE",
    failureReason: "Leader proposed a result, but validator consensus rejected it. No comparison was persisted onchain.",
    events: [
      { state: "FINALIZED", at: createdAt, detail: "Transaction finalized after four rounds and three rotations." },
      { state: "MAJORITY_DISAGREE", at: "2026-09-11T03:30:39.000Z", detail: "Three validators disagreed; two later became idle after quorum." },
      { state: "CONSENSUS_REJECTED", at: "2026-09-11T03:30:39.000Z", detail: "No onchain comparison exists for this run." },
    ],
  };
  const cache = getDb();
  cache.comparisonRuns ??= {};
  cache.comparisonRuns[run.runId] = run;
  persist(databasePath(), cache);
  return run;
}

export function dbHealth() {
  getDb();
  return true;
}
