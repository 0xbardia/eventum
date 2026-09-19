import { getConfig } from "./config";
import { getComparisonRunRecord, updateComparisonRun, type StoredComparisonRun } from "./db";
import { getLatestSnapshot, getRelationship, readTransaction } from "./genlayer";
import { classifyTransaction } from "./transaction-status";
import type { ComparisonRun, MarketSnapshot } from "./types";

const TERMINAL = new Set(["PERSISTED_ONCHAIN", "MAJORITY_DISAGREE", "CONSENSUS_REJECTED", "EXECUTION_FAILED"]);

export function rejectionExplanation(stage: "snapshotA" | "snapshotB" | "comparison") {
  return stage === "comparison"
    ? "GenLayer validators did not accept the proposed semantic relationship, so no comparison was persisted onchain."
    : "GenLayer validators did not accept the proposed snapshot registration, so no snapshot was persisted onchain.";
}

export class ReconciliationError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 422) {
    super(message);
    this.name = "ReconciliationError";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function plain(value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), plain(item)]));
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  return value;
}

function readableCall(value: unknown): Record<string, unknown> | null {
  const item = record(plain(value));
  if (!item) return null;
  const readable = item.readable;
  if (typeof readable === "string") {
    try {
      const parsed = JSON.parse(readable) as unknown;
      const parsedRecord = record(parsed);
      if (parsedRecord) return parsedRecord;
    } catch {
      // The SDK still gives us the decoded call below when readable is not JSON.
    }
  }
  return item;
}

function decodedCall(transaction: unknown): Record<string, unknown> | null {
  const item = record(transaction);
  if (!item) return null;
  const decoded = record(item.txDataDecoded);
  const data = record(item.data);
  for (const candidate of [decoded?.callData, data?.calldata, data?.callData, decoded]) {
    const call = readableCall(candidate);
    if (call?.method || call?.functionName || call?.function_name) return call;
  }
  return null;
}

function transactionTarget(transaction: unknown): string | undefined {
  const item = record(transaction);
  for (const key of ["to_address", "recipient", "to", "toAddress"]) {
    if (typeof item?.[key] === "string") return item[key] as string;
  }
  return undefined;
}

function transactionChainId(transaction: unknown): number | undefined {
  const item = record(transaction);
  for (const key of ["chainId", "chain_id"]) {
    const value = item?.[key];
    if (typeof value === "number" && Number.isInteger(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  return undefined;
}

function callMethod(call: Record<string, unknown> | null): string | undefined {
  for (const key of ["method", "functionName", "function_name"]) {
    if (typeof call?.[key] === "string") return call[key] as string;
  }
  return undefined;
}

function callArgs(call: Record<string, unknown> | null): unknown[] | undefined {
  return Array.isArray(call?.args) ? call.args : undefined;
}

function sameStrings(actual: unknown[], expected: string[]): boolean {
  return actual.length >= expected.length && expected.every((value, index) => String(actual[index]) === value);
}

function assertTransactionBinding(transaction: unknown, run: StoredComparisonRun, stage: "snapshotA" | "snapshotB" | "comparison") {
  const config = getConfig();
  const target = transactionTarget(transaction);
  if (target && target.toLowerCase() !== config.GENLAYER_CONTRACT_ADDRESS.toLowerCase()) {
    throw new ReconciliationError("TX_CONTRACT_MISMATCH", "The transaction targets a different Eventum contract.");
  }
  const chainId = transactionChainId(transaction);
  if (chainId !== undefined && chainId !== config.GENLAYER_CHAIN_ID) {
    throw new ReconciliationError("TX_CHAIN_MISMATCH", "The transaction belongs to a different chain.");
  }
  const call = decodedCall(transaction);
  const method = callMethod(call);
  const expectedMethod = stage === "comparison" ? "compare_markets" : "register_market_snapshot";
  if (method && method !== expectedMethod) throw new ReconciliationError("TX_METHOD_MISMATCH", "The transaction method does not match this run stage.");
  const args = callArgs(call);
  if (!args) return;
  if (stage === "comparison" && !sameStrings(args, [run.snapshotAId, run.snapshotBId, run.comparisonVersion])) {
    throw new ReconciliationError("TX_ARGUMENT_MISMATCH", "The comparison transaction does not belong to this run.");
  }
  if (stage !== "comparison") {
    const expected = run.registerArgs?.[stage === "snapshotA" ? 0 : 1];
    if (expected && !sameStrings(args, expected)) throw new ReconciliationError("TX_ARGUMENT_MISMATCH", "The snapshot transaction does not belong to this run.");
  }
}

function transition(runId: string, patch: Partial<ComparisonRun>, detail: string): ComparisonRun {
  const current = getComparisonRunRecord(runId);
  if (!current) throw new ReconciliationError("COMPARISON_RUN_NOT_FOUND", "Comparison run not found.", 404);
  const event = patch.state && patch.state !== current.state ? { state: patch.state, at: new Date().toISOString(), detail } : undefined;
  return updateComparisonRun(runId, patch, event);
}

function snapshotPatch(run: StoredComparisonRun, index: 0 | 1, snapshot: MarketSnapshot): Partial<ComparisonRun> {
  const snapshots = run.snapshots ? [...run.snapshots] as [MarketSnapshot, MarketSnapshot] : undefined;
  if (snapshots) snapshots[index] = snapshot;
  return {
    ...(index === 0 ? { snapshotAId: snapshot.snapshotId } : { snapshotBId: snapshot.snapshotId }),
    ...(snapshots ? { snapshots } : {}),
    state: index === 0 ? "SNAPSHOT_A_VERIFIED" : "SNAPSHOT_B_VERIFIED",
    failureReason: undefined,
  };
}

async function syncExistingSnapshots(run: StoredComparisonRun): Promise<StoredComparisonRun> {
  if (!run.registerArgs || run.snapshotATx || run.snapshotBTx || run.comparisonTx) return run;
  let current = run;
  let authoritativeSnapshots = 0;
  for (const index of [0, 1] as const) {
    const registerArgs = current.registerArgs;
    if (!registerArgs) return current;
    const args = registerArgs[index];
    try {
      const snapshot = await getLatestSnapshot(args[0], args[1]);
      if (snapshot.sourceHash.toLowerCase() !== args[13].toLowerCase()) continue;
      authoritativeSnapshots += 1;
      current = getComparisonRunRecord(current.runId)!;
      transition(current.runId, snapshotPatch(current, index, snapshot), `Snapshot ${index === 0 ? "A" : "B"} already matches the authoritative onchain record.`);
    } catch {
      // A missing latest snapshot is the normal pre-write state.
    }
  }
  current = getComparisonRunRecord(current.runId)!;
  if (authoritativeSnapshots < 2) return current;
  try {
    const comparison = await getRelationship(current.snapshotAId, current.snapshotBId);
    transition(current.runId, {
      state: "PERSISTED_ONCHAIN",
      comparisonId: comparison.comparisonId,
      consensusOutcome: "MAJORITY_AGREE",
      executionResult: "FINISHED_WITH_RETURN",
      persistedOnchain: true,
      relation: comparison.relation,
      safeToCompare: comparison.safeToCompare,
      safeToAggregate: comparison.safeToAggregate,
      outcomeMapping: comparison.outcomeMapping,
      reasonCodes: comparison.reasonCodes,
      materialDifferences: comparison.materialDifferences,
      failureReason: undefined,
    }, "The existing authoritative comparison matches this run; no write was submitted.");
  } catch {
    // No existing comparison for this pair; the wallet may continue the run.
  }
  return getComparisonRunRecord(current.runId)!;
}

export async function reconcileComparisonRun(runId: string): Promise<ComparisonRun> {
  let run = getComparisonRunRecord(runId);
  if (!run) throw new ReconciliationError("COMPARISON_RUN_NOT_FOUND", "Comparison run not found.", 404);
  if (TERMINAL.has(run.state)) return updateComparisonRun(runId, {});
  if (!run.comparisonTx && !run.snapshotATx && !run.snapshotBTx) {
    run = await syncExistingSnapshots(run);
    return updateComparisonRun(runId, {});
  }

  const stage: "snapshotA" | "snapshotB" | "comparison" = run.comparisonTx ? "comparison" : run.snapshotBTx ? "snapshotB" : "snapshotA";
  const hash = stage === "comparison" ? run.comparisonTx : stage === "snapshotB" ? run.snapshotBTx : run.snapshotATx;
  if (!hash) return updateComparisonRun(runId, {});
  let transaction: unknown;
  try {
    transaction = await readTransaction(hash);
  } catch {
    return transition(runId, { state: "RPC_UNAVAILABLE", failureReason: "Verification is temporarily unavailable. Your submitted transaction has not been resubmitted." }, "Verification is temporarily unavailable; the same transaction hash remains preserved.");
  }
  if (!transaction) return transition(runId, { state: "VERIFICATION_PENDING" }, "The same transaction hash is still pending indexing; no new transaction was submitted.");
  assertTransactionBinding(transaction, run, stage);
  const classification = classifyTransaction(transaction);
  if (classification.state === "pending") {
    return transition(runId, { state: "CONSENSUS_PENDING", failureReason: undefined }, "The same transaction hash is awaiting GenLayer consensus.");
  }
  if (classification.state === "verification-pending") {
    return transition(runId, { state: "FINALIZED_VERIFYING", failureReason: undefined }, "The transaction is finalized; execution verification is still pending.");
  }
  if (classification.state === "consensus-error") {
    return transition(runId, {
      state: "MAJORITY_DISAGREE",
      consensusOutcome: classification.consensusResultName,
      executionResult: classification.executionResultName,
      persistedOnchain: false,
      failureReason: rejectionExplanation(stage),
    }, "The transaction reached a consensus decision without accepting the proposal; no replacement transaction was submitted.");
  }
  if (classification.state === "execution-error") {
    return transition(runId, {
      state: "EXECUTION_FAILED",
      executionResult: classification.executionResultName,
      persistedOnchain: false,
      failureReason: stage === "comparison" ? "The comparison transaction finalized, but contract execution failed; no comparison was persisted onchain." : "The snapshot transaction finalized, but contract execution failed; no snapshot was persisted onchain.",
    }, "The transaction finalized with a contract execution error; no replacement transaction was submitted.");
  }

  try {
    if (stage !== "comparison") {
      const current = getComparisonRunRecord(runId)!;
      const args = current.registerArgs?.[stage === "snapshotA" ? 0 : 1];
      if (!args) throw new ReconciliationError("SNAPSHOT_ARGS_MISSING", "Snapshot registration arguments are unavailable.");
      const snapshot = await getLatestSnapshot(args[0], args[1]);
      if (snapshot.sourceHash.toLowerCase() !== args[13].toLowerCase()) throw new ReconciliationError("SNAPSHOT_SOURCE_MISMATCH", "The authoritative snapshot does not match the submitted source evidence.");
      return transition(runId, { ...snapshotPatch(current, stage === "snapshotA" ? 0 : 1, snapshot), consensusOutcome: classification.consensusResultName, executionResult: classification.executionResultName }, "The finalized snapshot was read back from the current Eventum contract.");
    }
    const current = getComparisonRunRecord(runId)!;
    const comparison = await getRelationship(current.snapshotAId, current.snapshotBId);
    if (comparison.snapshotAId !== current.snapshotAId || comparison.snapshotBId !== current.snapshotBId || comparison.comparisonVersion !== current.comparisonVersion) {
      throw new ReconciliationError("COMPARISON_READBACK_MISMATCH", "The authoritative comparison does not match this run.");
    }
    return transition(runId, {
      state: "PERSISTED_ONCHAIN",
      comparisonId: comparison.comparisonId,
      consensusOutcome: classification.consensusResultName || "MAJORITY_AGREE",
      executionResult: classification.executionResultName,
      persistedOnchain: true,
      relation: comparison.relation,
      safeToCompare: comparison.safeToCompare,
      safeToAggregate: comparison.safeToAggregate,
      outcomeMapping: comparison.outcomeMapping,
      reasonCodes: comparison.reasonCodes,
      materialDifferences: comparison.materialDifferences,
      failureReason: undefined,
    }, "The finalized comparison was read back from the current Eventum contract; all displayed result fields are authoritative.");
  } catch (error) {
    if (error instanceof ReconciliationError) throw error;
    return transition(runId, { state: "RPC_UNAVAILABLE", failureReason: "Verification is temporarily unavailable. Your submitted transaction has not been resubmitted." }, "The transaction remains preserved while authoritative read-back is temporarily unavailable.");
  }
}

export function validateTransactionClaim(transaction: unknown, run: StoredComparisonRun, stage: "snapshotA" | "snapshotB" | "comparison") {
  assertTransactionBinding(transaction, run, stage);
}
