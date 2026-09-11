import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConfig } from "../../src/lib/config";

const address = "0x1111111111111111111111111111111111111111";
const base = {
  APP_ENV: "production",
  APP_URL: "https://eventum.bydx.fun",
  APP_HOST: "127.0.0.1",
  APP_PORT: "4187",
  DATABASE_PATH: "./data/eventum-cache.json",
  LOG_LEVEL: "info",
  GENLAYER_NETWORK: "studionet",
  GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
  GENLAYER_CHAIN_ID: "61999",
  GENLAYER_CONTRACT_ADDRESS: address,
  GENLAYER_EXPLORER_URL: "https://explorer-studio.genlayer.com/",
  GENLAYER_STUDIO_URL: "https://studio.genlayer.com/contracts",
  POLYMARKET_GAMMA_API_BASE_URL: "https://gamma-api.polymarket.com",
  POLYMARKET_GAMMA_API_ALLOWED_HOSTS: "gamma-api.polymarket.com",
  POLYMARKET_ALLOWED_HOSTS: "polymarket.com,www.polymarket.com",
  FETCH_TIMEOUT_MS: "10000",
  FETCH_MAX_BYTES: "1000000",
  MAX_REQUEST_BODY_BYTES: "65536",
  RATE_LIMIT_WINDOW_MS: "60000",
  RATE_LIMIT_MAX: "30",
} as const;

function environment(overrides: Record<string, string | undefined> = {}) {
  const value: Record<string, string> = { ...base };
  for (const [name, replacement] of Object.entries(overrides)) {
    if (replacement === undefined) delete value[name];
    else value[name] = replacement;
  }
  return value;
}

test("configuration rejects missing required variables without fallback", () => {
  assert.throws(() => parseConfig(environment({ APP_URL: undefined })), /Missing required environment variable: APP_URL/);
});

test("configuration rejects invalid chain IDs and addresses", () => {
  assert.throws(() => parseConfig(environment({ GENLAYER_CHAIN_ID: "not-a-number" })), /GENLAYER_CHAIN_ID/);
  assert.throws(() => parseConfig(environment({ GENLAYER_CONTRACT_ADDRESS: "0x123" })), /20-byte hex address/);
});

test("configuration rejects a zero contract address", () => {
  assert.throws(() => parseConfig(environment({ GENLAYER_CONTRACT_ADDRESS: `0x${"0".repeat(40)}` })), /zero address/);
});

test("valid production configuration is parsed without changing values", () => {
  const config = parseConfig(environment());
  assert.equal(config.APP_URL, "https://eventum.bydx.fun");
  assert.equal(config.GENLAYER_CHAIN_ID, 61999);
  assert.equal(config.GENLAYER_CONTRACT_ADDRESS, address);
  assert.equal(config.MAX_REQUEST_BODY_BYTES, 65536);
});
