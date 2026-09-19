export const RELATIONS = [
  "EQUIVALENT",
  "CONDITIONAL_EQUIVALENT",
  "SUBSET",
  "SUPERSET",
  "OVERLAPPING",
  "CONFLICTING",
  "TEMPORAL_MISMATCH",
  "SOURCE_MISMATCH",
  "OUTCOME_MISMATCH",
  "UNRELATED",
  "AMBIGUOUS",
] as const;

export type Relation = (typeof RELATIONS)[number];

export type MarketEvidence = {
  platform: "polymarket";
  platformMarketId: string;
  sourceUrl: string;
  title: string;
  description: string;
  outcomes: string[];
  resolutionRules: string;
  resolutionSource: string;
  openTime: string;
  closeTime: string;
  resolutionDeadline: string;
  clarifications: string;
  retrievedAt: string;
  sourceHash: string;
  normalizedFacts: Record<string, unknown>;
  canonicalEventHint: string;
  providerLabel: "Polymarket Gamma API";
  rawPayload: unknown;
};

export type MarketSnapshot = Omit<MarketEvidence, "rawPayload"> & {
  snapshotId: string;
  version: number;
  marketKey: string;
  authority: "onchain" | "offchain-preview";
  sourceEvidenceHash?: string;
};

export type OutcomeMapping = Record<string, string[]>;

export type Comparison = {
  comparisonId: string;
  snapshotAId: string;
  snapshotBId: string;
  relation: Relation;
  safeToCompare: boolean;
  safeToAggregate: boolean;
  canonicalEventKeyIfSafe: string;
  outcomeMapping: OutcomeMapping;
  reasonCodes: string[];
  materialDifferences: string[];
  conciseRationale: string;
  evidenceHashes: string[];
  comparisonVersion: string;
  createdAt: string;
  direct?: boolean;
  authority?: "onchain" | "offchain-preview";
  transactionHash?: string;
};

export type GraphEdge = Pick<
  Comparison,
  | "comparisonId"
  | "snapshotAId"
  | "snapshotBId"
  | "relation"
  | "safeToCompare"
  | "safeToAggregate"
  | "canonicalEventKeyIfSafe"
  | "comparisonVersion"
> & { direct: true };

export type ComparisonRunEvent = {
  state: string;
  at: string;
  detail?: string;
};

export type ComparisonRun = {
  runId: string;
  createdAt: string;
  updatedAt: string;
  snapshotAId: string;
  snapshotBId: string;
  comparisonVersion: string;
  snapshots?: [MarketSnapshot, MarketSnapshot];
  registerArgs?: [string[], string[]];
  walletAddress?: string;
  contractAddress: string;
  network: string;
  chainId: number;
  snapshotATx?: string;
  snapshotBTx?: string;
  comparisonTx?: string;
  comparisonId?: string;
  consensusOutcome?: string;
  leaderRelation?: Relation;
  executionResult?: string;
  persistedOnchain: boolean;
  relation?: Relation;
  safeToCompare?: boolean;
  safeToAggregate?: boolean;
  outcomeMapping?: OutcomeMapping;
  reasonCodes?: string[];
  materialDifferences?: string[];
  failureReason?: string;
  state: string;
  events: ComparisonRunEvent[];
};

export type ContractStatus = {
  configured: boolean;
  network: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  protocol: string;
  protocolVersion?: string;
  contractReachable: boolean;
  checkedAt: string;
  error?: string;
};
