import { createClient } from "genlayer-js";
import { localnet, studionet, testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import { EVENTUM_PROTOCOL, getConfig, getPublicConfig } from "./config";
import type { Comparison, ContractStatus, GraphEdge, MarketSnapshot } from "./types";

type HexAddress = `0x${string}`;

export class ContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "ContractError";
  }
}

function chainFor(network: string) {
  if (network === "studionet") return studionet;
  if (network === "bradbury") return testnetBradbury;
  return localnet;
}

export function contractAddress(): HexAddress | null {
  const address = getConfig().GENLAYER_CONTRACT_ADDRESS;
  return address ? (address as HexAddress) : null;
}

function readClient() {
  const config = getConfig();
  return createClient({ chain: chainFor(config.GENLAYER_NETWORK), endpoint: config.GENLAYER_RPC_URL });
}

function asJson(value: unknown): Record<string, unknown> | unknown[] | string | number | boolean | null {
  if (typeof value !== "string") return value as Record<string, unknown> | unknown[] | string | number | boolean | null;
  try {
    return JSON.parse(value) as Record<string, unknown> | unknown[];
  } catch {
    return value;
  }
}

function snapshotFromContract(raw: unknown): MarketSnapshot {
  const value = asJson(raw);
  if (!value || Array.isArray(value) || typeof value !== "object") throw new ContractError("INVALID_CONTRACT_RESPONSE", "The contract returned an invalid market snapshot.");
  const item = value as Record<string, unknown>;
  return {
    snapshotId: String(item.snapshot_id),
    marketKey: String(item.market_key),
    version: Number(item.version),
    platform: String(item.platform) as "polymarket",
    platformMarketId: String(item.platform_market_id),
    sourceUrl: String(item.source_url),
    title: String(item.title),
    description: String(item.description),
    outcomes: Array.isArray(item.outcomes) ? item.outcomes.map(String) : [],
    resolutionRules: String(item.resolution_rules),
    resolutionSource: String(item.resolution_source ?? ""),
    openTime: String(item.open_time ?? ""),
    closeTime: String(item.close_time ?? ""),
    resolutionDeadline: String(item.resolution_deadline ?? ""),
    clarifications: String(item.clarifications ?? ""),
    retrievedAt: String(item.retrieved_at),
    sourceHash: String(item.source_hash),
    sourceEvidenceHash: item.source_evidence_hash ? String(item.source_evidence_hash) : undefined,
    normalizedFacts: (item.normalized_facts ?? {}) as Record<string, unknown>,
    canonicalEventHint: String(item.canonical_event_hint ?? ""),
    providerLabel: "Polymarket Gamma API",
    authority: "onchain",
  };
}

function comparisonFromContract(raw: unknown): Comparison {
  const value = asJson(raw);
  if (!value || Array.isArray(value) || typeof value !== "object") throw new ContractError("INVALID_CONTRACT_RESPONSE", "The contract returned an invalid comparison.");
  const item = value as Record<string, unknown>;
  return {
    comparisonId: String(item.comparison_id),
    snapshotAId: String(item.snapshot_a_id),
    snapshotBId: String(item.snapshot_b_id),
    relation: String(item.relation) as Comparison["relation"],
    safeToCompare: Boolean(item.safe_to_compare),
    safeToAggregate: Boolean(item.safe_to_aggregate),
    canonicalEventKeyIfSafe: String(item.canonical_event_key_if_safe ?? ""),
    outcomeMapping: (item.outcome_mapping ?? {}) as Comparison["outcomeMapping"],
    reasonCodes: Array.isArray(item.reason_codes) ? item.reason_codes.map(String) : [],
    materialDifferences: Array.isArray(item.material_differences) ? item.material_differences.map(String) : [],
    conciseRationale: String(item.concise_rationale ?? ""),
    evidenceHashes: Array.isArray(item.evidence_hashes) ? item.evidence_hashes.map(String) : [],
    comparisonVersion: String(item.comparison_version),
    createdAt: String(item.created_at ?? ""),
    direct: item.direct !== false,
    authority: "onchain",
  };
}

export async function readContract(functionName: string, args: unknown[] = []): Promise<unknown> {
  const address = contractAddress();
  if (!address) throw new ContractError("CONTRACT_NOT_CONFIGURED", "The Eventum contract is not configured yet.", 503);
  try {
    return await readClient().readContract({
      address,
      functionName,
      args: args as never[],
      transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
      jsonSafeReturn: true,
    });
  } catch {
    throw new ContractError("CONTRACT_READ_FAILED", "The deployed Eventum contract could not be read.", 502);
  }
}

export async function readTransaction(hash: string): Promise<unknown> {
  try {
    return await readClient().getTransaction({ hash: hash as Hash });
  } catch {
    throw new ContractError("TRANSACTION_READ_FAILED", "The transaction could not be read from GenLayer.", 502);
  }
}

export async function getSnapshot(snapshotId: string): Promise<MarketSnapshot> {
  return snapshotFromContract(await readContract("get_market_snapshot", [snapshotId]));
}

export async function getLatestSnapshot(platform: string, platformMarketId: string): Promise<MarketSnapshot> {
  return snapshotFromContract(await readContract("get_latest_market_snapshot", [platform, platformMarketId]));
}

export async function getComparison(comparisonId: string): Promise<Comparison> {
  return comparisonFromContract(await readContract("get_comparison", [comparisonId]));
}

export async function getRelationship(snapshotAId: string, snapshotBId: string): Promise<Comparison> {
  return comparisonFromContract(await readContract("get_relationship", [snapshotAId, snapshotBId]));
}

export async function getGraphEdges(offset = 0, limit = 50): Promise<GraphEdge[]> {
  const raw = asJson(await readContract("get_graph_edges", [offset, limit]));
  if (!Array.isArray(raw)) throw new ContractError("INVALID_CONTRACT_RESPONSE", "The contract returned invalid graph edges.");
  return raw.map((edge) => {
    const item = edge as Record<string, unknown>;
    return {
      comparisonId: String(item.comparison_id),
      snapshotAId: String(item.snapshot_a_id),
      snapshotBId: String(item.snapshot_b_id),
      relation: String(item.relation) as GraphEdge["relation"],
      safeToCompare: Boolean(item.safe_to_compare),
      safeToAggregate: Boolean(item.safe_to_aggregate),
      canonicalEventKeyIfSafe: String(item.canonical_event_key_if_safe ?? ""),
      comparisonVersion: String(item.comparison_version),
      direct: true,
    };
  });
}

export async function getContractStatus(): Promise<ContractStatus> {
  const config = getConfig();
  const publicConfig = getPublicConfig();
  const base = {
    configured: Boolean(config.GENLAYER_CONTRACT_ADDRESS),
    network: publicConfig.network,
    chainId: publicConfig.chainId,
    rpcUrl: publicConfig.rpcUrl,
    contractAddress: publicConfig.contractAddress,
    protocol: EVENTUM_PROTOCOL,
    checkedAt: new Date().toISOString(),
    contractReachable: false,
  } satisfies ContractStatus;
  if (!config.GENLAYER_CONTRACT_ADDRESS) return base;
  try {
    const version = await readContract("get_protocol_version");
    const protocolVersion = String(version);
    return { ...base, protocol: protocolVersion, protocolVersion, contractReachable: true };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : "Contract read failed." };
  }
}
