export type PublicConfig = {
  network: "studionet" | "bradbury";
  rpcUrl: string;
  chainId: number;
  contractAddress: string;
  explorerUrl: string;
  studioUrl: string;
};

export function parsePublicConfig(value: unknown): PublicConfig {
  if (!value || typeof value !== "object") throw new Error("Eventum runtime configuration is invalid.");
  const config = value as Record<string, unknown>;
  const network = config.network;
  const rpcUrl = config.rpcUrl;
  const chainId = config.chainId;
  const contractAddress = config.contractAddress;
  const explorerUrl = config.explorerUrl;
  const studioUrl = config.studioUrl;
  if (
    (network !== "studionet" && network !== "bradbury") ||
    typeof rpcUrl !== "string" ||
    typeof chainId !== "number" ||
    !Number.isInteger(chainId) ||
    typeof contractAddress !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(contractAddress) ||
    typeof explorerUrl !== "string" ||
    typeof studioUrl !== "string"
  ) throw new Error("Eventum runtime configuration is invalid.");
  return { network, rpcUrl, chainId, contractAddress, explorerUrl, studioUrl };
}

export async function loadPublicConfig(): Promise<PublicConfig> {
  const response = await fetch("/api/runtime-config", { cache: "no-store" });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Eventum runtime configuration is unavailable.");
  }
  if (!response.ok) throw new Error("Eventum runtime configuration is unavailable.");
  return parsePublicConfig(body);
}
