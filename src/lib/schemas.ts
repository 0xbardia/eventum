import { z } from "zod";

export const resolveMarketSchema = z.object({
  url: z.string().trim().min(1).max(2048),
}).strict();

export const prepareComparisonSchema = z.object({
  urls: z.array(z.string().trim().min(1).max(2048)).length(2),
  comparisonVersion: z.literal("1.0.0").default("1.0.0"),
}).strict();

const hexId = z.string().regex(/^[a-f0-9]{64}$/i);
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
  sourceEvidenceHash: hexId.optional(),
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
}).strict();

const transactionHash = z.string().regex(/^0x[a-f0-9]{64}$/i);

export const updateComparisonRunSchema = z.object({
  snapshotATx: transactionHash.optional(),
  snapshotBTx: transactionHash.optional(),
  comparisonTx: transactionHash.optional(),
}).strict();
