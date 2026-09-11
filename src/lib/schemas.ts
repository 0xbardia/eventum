import { z } from "zod";
import { RELATIONS } from "./types";

export const resolveMarketSchema = z.object({
  url: z.string().trim().min(1).max(2048),
}).strict();

export const prepareComparisonSchema = z.object({
  urls: z.array(z.string().trim().min(1).max(2048)).length(2),
  comparisonVersion: z.literal("1.0.0").default("1.0.0"),
}).strict();

const hexId = z.string().regex(/^[a-f0-9]{64}$/i);
const hexAddress = z.string().regex(/^0x[a-f0-9]{40}$/i);
const relationSchema = z.enum(RELATIONS);
const publicSnapshotSchema = z.object({
  snapshotId: hexId,
  marketKey: hexId,
  version: z.number().int().min(0).max(1000000),
  platform: z.literal("polymarket"),
  platformMarketId: z.string().min(1).max(256),
  sourceUrl: z.string().url().max(512),
  title: z.string().min(1).max(500),
  description: z.string().max(6000),
  outcomes: z.array(z.string().min(1).max(64)).min(2).max(16),
  resolutionRules: z.string().min(1).max(8000),
  resolutionSource: z.string().max(1000),
  openTime: z.string().max(128),
  closeTime: z.string().max(128),
  resolutionDeadline: z.string().max(128),
  clarifications: z.string().max(5000),
  retrievedAt: z.string().min(1).max(128),
  sourceHash: hexId,
  normalizedFacts: z.record(z.string().max(64), z.unknown()),
  canonicalEventHint: z.string().max(160),
  providerLabel: z.literal("Polymarket Gamma API"),
  authority: z.enum(["onchain", "offchain-preview"]),
}).strict().superRefine((snapshot, context) => {
  if (snapshot.authority === "offchain-preview" && snapshot.version !== 0) {
    context.addIssue({ code: "custom", path: ["version"], message: "Offchain previews must use version 0." });
  }
  if (snapshot.authority === "onchain" && snapshot.version < 1) {
    context.addIssue({ code: "custom", path: ["version"], message: "Onchain snapshots must use version >= 1." });
  }
});

const registerArgsSchema = z.array(z.string().max(10000)).length(16);

export const createComparisonRunSchema = z.object({
  snapshotAId: hexId,
  snapshotBId: hexId,
  comparisonVersion: z.literal("1.0.0"),
  snapshots: z.array(publicSnapshotSchema).length(2),
  registerArgs: z.array(registerArgsSchema).length(2),
  walletAddress: hexAddress.optional(),
  contractAddress: hexAddress,
  network: z.enum(["studionet", "bradbury"]),
  chainId: z.number().int().positive(),
}).strict();

export const updateComparisonRunSchema = z.object({
  state: z.string().min(1).max(64).optional(),
  walletAddress: hexAddress.optional(),
  snapshotATx: z.string().max(100).optional(),
  snapshotBTx: z.string().max(100).optional(),
  comparisonTx: z.string().max(100).optional(),
  comparisonId: hexId.optional(),
  consensusOutcome: z.string().max(64).optional(),
  executionResult: z.string().max(64).optional(),
  persistedOnchain: z.boolean().optional(),
  relation: relationSchema.optional(),
  leaderRelation: relationSchema.optional(),
  safeToCompare: z.boolean().optional(),
  safeToAggregate: z.boolean().optional(),
  outcomeMapping: z.record(z.string().max(64), z.array(z.string().max(64)).max(16)).optional(),
  reasonCodes: z.array(z.string().max(64)).max(8).optional(),
  materialDifferences: z.array(z.string().max(280)).max(8).optional(),
  failureReason: z.string().max(1000).optional(),
  eventState: z.string().min(1).max(64).optional(),
  eventDetail: z.string().max(500).optional(),
}).strict();
