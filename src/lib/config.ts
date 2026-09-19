import { z } from "zod";

export const EVENTUM_PROTOCOL = "eventum/1.1.1" as const;

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]),
  APP_URL: z.string().url(),
  APP_HOST: z.string().min(1),
  APP_PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_PATH: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
  GENLAYER_NETWORK: z.enum(["studionet", "bradbury"]),
  GENLAYER_RPC_URL: z.string().url(),
  GENLAYER_CHAIN_ID: z.coerce.number().int().positive(),
  GENLAYER_CONTRACT_ADDRESS: z.string().default(""),
  GENLAYER_EXPLORER_URL: z.string().url(),
  GENLAYER_STUDIO_URL: z.string().url(),
  DEPLOYER_PRIVATE_KEY: z.string().default(""),
  POLYMARKET_GAMMA_API_BASE_URL: z.string().url(),
  POLYMARKET_GAMMA_API_ALLOWED_HOSTS: z.string().min(1),
  POLYMARKET_ALLOWED_HOSTS: z.string().min(1),
  FETCH_TIMEOUT_MS: z.coerce.number().int().positive().max(60000),
  FETCH_MAX_BYTES: z.coerce.number().int().positive().max(5000000),
  MAX_REQUEST_BODY_BYTES: z.coerce.number().int().positive().max(5000000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().max(1000),
});

export type AppConfig = z.infer<typeof envSchema>;

const chainIds = { studionet: 61999, bradbury: 4221 } as const;
const requiredEnvironment = [
  "APP_ENV",
  "APP_URL",
  "APP_HOST",
  "APP_PORT",
  "DATABASE_PATH",
  "LOG_LEVEL",
  "GENLAYER_NETWORK",
  "GENLAYER_RPC_URL",
  "GENLAYER_CHAIN_ID",
  "GENLAYER_EXPLORER_URL",
  "GENLAYER_STUDIO_URL",
  "POLYMARKET_GAMMA_API_BASE_URL",
  "POLYMARKET_GAMMA_API_ALLOWED_HOSTS",
  "POLYMARKET_ALLOWED_HOSTS",
  "FETCH_TIMEOUT_MS",
  "FETCH_MAX_BYTES",
  "MAX_REQUEST_BODY_BYTES",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX",
] as const;

export function configuredHosts(value: string): string[] {
  return value.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
}

function requireHttps(value: string, field: string, production: boolean) {
  const url = new URL(value);
  if (production && url.protocol !== "https:") throw new Error(`${field} must use HTTPS in production`);
  if (url.username || url.password) throw new Error(`${field} must not contain credentials`);
  return url;
}

function validateCrossFields(config: AppConfig): AppConfig {
  const production = config.APP_ENV === "production";
  requireHttps(config.APP_URL, "APP_URL", production);
  requireHttps(config.GENLAYER_RPC_URL, "GENLAYER_RPC_URL", production);
  requireHttps(config.GENLAYER_EXPLORER_URL, "GENLAYER_EXPLORER_URL", production);
  requireHttps(config.GENLAYER_STUDIO_URL, "GENLAYER_STUDIO_URL", production);

  if (config.GENLAYER_CHAIN_ID !== chainIds[config.GENLAYER_NETWORK]) {
    throw new Error(`GENLAYER_CHAIN_ID does not match ${config.GENLAYER_NETWORK}`);
  }
  const address = config.GENLAYER_CONTRACT_ADDRESS.trim();
  if (production && !address) throw new Error("Missing required environment variable: GENLAYER_CONTRACT_ADDRESS");
  if (address && !addressPattern.test(address)) {
    throw new Error("GENLAYER_CONTRACT_ADDRESS must be a 20-byte hex address");
  }
  if (address.toLowerCase() === `0x${"0".repeat(40)}`) throw new Error("GENLAYER_CONTRACT_ADDRESS must not be the zero address");

  const marketHosts = configuredHosts(config.POLYMARKET_ALLOWED_HOSTS);
  if (!marketHosts.length || marketHosts.some((host) => !["polymarket.com", "www.polymarket.com"].includes(host))) {
    throw new Error("POLYMARKET_ALLOWED_HOSTS may contain only verified Polymarket hosts");
  }
  const apiHosts = configuredHosts(config.POLYMARKET_GAMMA_API_ALLOWED_HOSTS);
  if (!apiHosts.length || apiHosts.some((host) => !host.endsWith(".polymarket.com"))) {
    throw new Error("POLYMARKET_GAMMA_API_ALLOWED_HOSTS must contain verified Polymarket API hosts");
  }
  const gammaUrl = requireHttps(config.POLYMARKET_GAMMA_API_BASE_URL, "POLYMARKET_GAMMA_API_BASE_URL", true);
  if (!apiHosts.includes(gammaUrl.hostname.toLowerCase())) {
    throw new Error("POLYMARKET_GAMMA_API_BASE_URL host is not in POLYMARKET_GAMMA_API_ALLOWED_HOSTS");
  }
  return config;
}

export function parseConfig(environment: Record<string, string | undefined> = process.env): AppConfig {
  const missing = requiredEnvironment.filter((name) => !environment[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment variable: ${missing.join(", ")}`);
  const result = envSchema.safeParse(environment);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Configuration error: ${details}`);
  }
  return validateCrossFields(result.data);
}

export function getConfig(): AppConfig {
  return parseConfig();
}

export function getPublicConfig() {
  const config = getConfig();
  return {
    network: config.GENLAYER_NETWORK,
    rpcUrl: config.GENLAYER_RPC_URL,
    chainId: config.GENLAYER_CHAIN_ID,
    contractAddress: config.GENLAYER_CONTRACT_ADDRESS,
    protocol: EVENTUM_PROTOCOL,
    explorerUrl: config.GENLAYER_EXPLORER_URL,
    studioUrl: config.GENLAYER_STUDIO_URL,
  };
}
