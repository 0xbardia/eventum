import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import { getConfig } from "../src/lib/config";

const config = getConfig();
if (config.GENLAYER_NETWORK !== "studionet") {
  throw new Error("GENLAYER_NETWORK must be studionet for this verifier.");
}
const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};
const rpcUrl = config.GENLAYER_RPC_URL;
const address = config.GENLAYER_CONTRACT_ADDRESS as `0x${string}`;
const snapshotA = required("EVENTUM_VERIFY_SNAPSHOT_A");
const snapshotB = required("EVENTUM_VERIFY_SNAPSHOT_B");
const comparisonId = required("EVENTUM_VERIFY_COMPARISON_ID");

const client = createClient({ chain: studionet, endpoint: rpcUrl });
const calls = [
  ["get_protocol_version", []],
  ["get_market_count", []],
  ["get_comparison_count", []],
  ["get_market_snapshot", [snapshotA]],
  ["get_latest_market_snapshot", ["polymarket", "eventum-live-a"]],
  ["get_market_ids", [0, 50]],
  ["get_comparison", [comparisonId]],
  ["get_latest_comparison", [snapshotA, snapshotB]],
  ["get_relationship", [snapshotB, snapshotA]],
  ["get_comparison_ids", [0, 50]],
  ["get_graph_edges", [0, 50]],
] as const;

function decode(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value) as unknown; } catch { return value; }
}

function json(value: unknown) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item, 2);
}

function object(value: unknown): Record<string, unknown> {
  const decoded = decode(value);
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("Expected a contract object");
  return decoded as Record<string, unknown>;
}

const results: Record<string, { args: unknown[]; actual?: unknown; status: "PASS" | "FAIL"; error?: string }> = {};
let failed = false;

async function main() {
  for (const [functionName, args] of calls) {
    try {
      const actual = decode(await client.readContract({
        address,
        functionName,
        args: [...(args as readonly unknown[])] as unknown as never[],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
        jsonSafeReturn: true,
      }));
      let valid = true;
      if (functionName === "get_protocol_version") valid = actual === "eventum/1.0.0";
      if (functionName === "get_market_count") valid = Number(actual) >= 2;
      if (functionName === "get_comparison_count") valid = Number(actual) >= 1;
      if (functionName === "get_market_snapshot") valid = object(actual).snapshot_id === snapshotA;
      if (functionName === "get_latest_market_snapshot") valid = object(actual).snapshot_id === snapshotA;
      if (functionName === "get_market_ids") valid = Array.isArray(actual) && actual.includes(snapshotA) && actual.includes(snapshotB);
      if (functionName === "get_comparison") valid = object(actual).comparison_id === comparisonId;
      if (functionName === "get_latest_comparison") valid = object(actual).snapshot_a_id === snapshotA && object(actual).snapshot_b_id === snapshotB;
      if (functionName === "get_relationship") valid = object(actual).snapshot_a_id === snapshotB && object(actual).snapshot_b_id === snapshotA;
      if (functionName === "get_comparison_ids") valid = Array.isArray(actual) && actual.includes(comparisonId);
      if (functionName === "get_graph_edges") valid = Array.isArray(actual) && actual.some((edge) => object(edge).comparison_id === comparisonId && object(edge).direct === true);
      results[functionName] = { args: [...args], actual, status: valid ? "PASS" : "FAIL" };
      if (!valid) failed = true;
    } catch (error) {
      failed = true;
      results[functionName] = { args: [...args], status: "FAIL", error: error instanceof Error ? error.message : String(error) };
    }
  }

  const report = { verifiedAt: new Date().toISOString(), network: config.GENLAYER_NETWORK, chainId: config.GENLAYER_CHAIN_ID, rpcUrl, address, results, status: failed ? "FAIL" : "PASS" };
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/studionet-read-verification.json", `${json(report)}\n`, { mode: 0o600 });
  console.log(json(report));
  if (failed) process.exitCode = 1;
}

void main();
