import dns from "node:dns/promises";
import net from "node:net";
import { configuredHosts, getConfig } from "../config";
import { canonicalJson, sha256 } from "../hash";
import type { MarketEvidence } from "../types";

export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 422,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

function privateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(normalized)) {
    const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mappedIpv4) return privateAddress(mappedIpv4);
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized.startsWith("::ffff:169.254.") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }
  return true;
}

export async function assertPublicHost(hostname: string, allowedHosts: string[]) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new ProviderError("SSRF_HOST_REJECTED", "The provider host is not public.", 400);
  }
  if (!allowedHosts.includes(host)) {
    throw new ProviderError("UNSUPPORTED_PROVIDER", "Only verified Polymarket URLs are supported.", 422);
  }
  if (net.isIP(host) && privateAddress(host)) {
    throw new ProviderError("SSRF_ADDRESS_REJECTED", "Private or special network addresses are not allowed.", 400);
  }
  try {
    const addresses = await dns.lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) {
      throw new ProviderError("SSRF_ADDRESS_REJECTED", "The provider resolved to a private or special address.", 400);
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("PROVIDER_DNS_FAILURE", "The provider hostname could not be verified.", 502);
  }
}

export function parsePolymarketUrl(rawUrl: string): { kind: "market" | "event"; slug: string; eventSlug?: string; canonicalUrl: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProviderError("INVALID_URL", "Enter a complete market URL.", 400);
  }
  const host = url.hostname.toLowerCase();
  const allowedHosts = configuredHosts(getConfig().POLYMARKET_ALLOWED_HOSTS);
  if (url.protocol !== "https:" || !allowedHosts.includes(host)) {
    throw new ProviderError("UNSUPPORTED_PROVIDER", "Only HTTPS public Polymarket market and event URLs are supported.", 422);
  }
  if (url.username || url.password || url.port) {
    throw new ProviderError("INVALID_MARKET_URL", "Use the canonical Polymarket URL without credentials or a port.", 400);
  }
  const segments = url.pathname.split("/");
  if (segments.at(-1) === "") segments.pop();
  if (segments[0] === "") segments.shift();
  const kind = segments[0] as "market" | "event" | undefined;
  const eventSlug = kind === "event" && segments.length === 3 ? segments[1] : undefined;
  const slug = eventSlug ? segments[2] : segments[1];
  const slugPattern = /^[a-z0-9][a-z0-9-]{1,240}$/i;
  if (
    (kind !== "market" && kind !== "event") ||
    segments.some((segment) => !segment) ||
    (kind === "market" && segments.length !== 2) ||
    (kind === "event" && segments.length !== 2 && segments.length !== 3) ||
    !slug ||
    !slugPattern.test(slug) ||
    (eventSlug !== undefined && !slugPattern.test(eventSlug))
  ) {
    throw new ProviderError("INVALID_MARKET_URL", "Enter a valid Polymarket market URL, such as polymarket.com/event/<event>/<market>.", 400);
  }
  return {
    kind,
    slug,
    ...(eventSlug ? { eventSlug } : {}),
    canonicalUrl: eventSlug
      ? `https://${allowedHosts[0]}/event/${eventSlug}/${slug}`
      : `https://${allowedHosts[0]}/${kind}/${slug}`,
  };
}

async function responseBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) throw new ProviderError("PROVIDER_EMPTY_BODY", "The provider returned an empty response.", 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ProviderError("PROVIDER_RESPONSE_TOO_LARGE", "The provider response exceeded the safety limit.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchJson(url: string, redirects = 0): Promise<unknown> {
  const config = getConfig();
  const target = new URL(url);
  await assertPublicHost(target.hostname, configuredHosts(config.POLYMARKET_GAMMA_API_ALLOWED_HOSTS));
  if (redirects > 2) throw new ProviderError("PROVIDER_REDIRECT_LIMIT", "The provider redirected too many times.", 502);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(target, {
      signal: controller.signal,
      redirect: "manual",
      headers: { Accept: "application/json", "User-Agent": `Eventum/0.1 (+${config.APP_URL})` },
    });
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("PROVIDER_UNAVAILABLE", "The provider could not be reached.", 502);
  }
  try {
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new ProviderError("PROVIDER_REDIRECT_INVALID", "The provider returned an invalid redirect.", 502);
      let next: URL;
      try {
        next = new URL(location, target);
      } catch {
        throw new ProviderError("PROVIDER_REDIRECT_INVALID", "The provider returned an invalid redirect.", 502);
      }
      if (next.protocol !== "https:" || next.hostname !== target.hostname) {
        throw new ProviderError("PROVIDER_REDIRECT_REJECTED", "Provider redirects must stay on the verified API host.", 502);
      }
      return fetchJson(next.toString(), redirects + 1);
    }
    if (!response.ok) throw new ProviderError("PROVIDER_HTTP_ERROR", `The provider returned HTTP ${response.status}.`, 502);
    if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      throw new ProviderError("PROVIDER_CONTENT_TYPE", "The provider did not return JSON.", 502);
    }
    const text = await responseBody(response, config.FETCH_MAX_BYTES);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ProviderError("PROVIDER_INVALID_JSON", "The provider returned malformed JSON.", 502);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function stringField(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function outcomesField(value: unknown): string[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 16 || parsed.some((item) => typeof item !== "string" || !item.trim())) {
    throw new ProviderError("PROVIDER_INVALID_MARKET", "The provider returned an invalid outcome list.", 502);
  }
  const normalized = parsed.map((item) => item.trim());
  if (new Set(normalized.map((item) => item.toLowerCase())).size !== normalized.length) {
    throw new ProviderError("PROVIDER_INVALID_MARKET", "The provider returned duplicate outcome labels.", 502);
  }
  return normalized;
}

export function canonicalEventHintFromParent(parent: { id?: string; slug?: string } | undefined): string {
  if (!parent) return "";
  const identity = stringField(parent.id).trim() || stringField(parent.slug).trim();
  if (!identity) return "";
  const hint = `polymarket:event:${identity}`;
  if (hint.length <= 160) return hint;
  return `polymarket:event:${sha256(identity)}`;
}

function parentFromEvents(events: unknown, eventSlug = ""): Record<string, unknown> | undefined {
  if (!Array.isArray(events)) return undefined;
  const objects = events.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  if (eventSlug) {
    return objects.find((item) => stringField(item.slug) === eventSlug);
  }
  return objects.length === 1 ? objects[0] : undefined;
}

function marketFromPayload(payload: unknown, sourceUrl: string, parentEvent?: Record<string, unknown>): MarketEvidence {
  if (!payload || typeof payload !== "object") throw new ProviderError("PROVIDER_INVALID_MARKET", "The provider returned an invalid market object.", 502);
  const market = payload as Record<string, unknown>;
  const platformMarketId = stringField(market.id);
  const title = stringField(market.question);
  const description = stringField(market.description);
  if (!platformMarketId || !title || !description) {
    throw new ProviderError("PROVIDER_INCOMPLETE_MARKET", "The provider did not publish enough rules to compare this market.", 422);
  }
  let outcomes: string[];
  try {
    outcomes = outcomesField(market.outcomes);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("PROVIDER_INVALID_MARKET", "The provider returned an invalid outcome list.", 502);
  }
  const resolutionSource = stringField(market.resolutionSource);
  const slug = stringField(market.slug);
  const parent = parentEvent ?? parentFromEvents(market.events);
  const eventSlug = stringField(parent?.slug);
  const eventTitle = stringField(parent?.title);
  const eventId = stringField(parent?.id);
  return {
    platform: "polymarket",
    platformMarketId,
    sourceUrl,
    title,
    description,
    outcomes,
    resolutionRules: description,
    resolutionSource,
    openTime: stringField(market.startDate),
    closeTime: stringField(market.endDate),
    resolutionDeadline: "",
    clarifications: "",
    retrievedAt: new Date().toISOString(),
    sourceHash: sha256(canonicalJson(payload)),
    normalizedFacts: {
      provider: "polymarket-gamma",
      market_slug: slug,
      event_slug: eventSlug,
      event_title: eventTitle,
      ...(eventId ? { event_id: eventId } : {}),
      condition_id: stringField(market.conditionId),
      outcome_count: outcomes.length,
      resolution_source_present: Boolean(resolutionSource),
    },
    canonicalEventHint: canonicalEventHintFromParent(parent ? { id: eventId, slug: eventSlug } : undefined),
    providerLabel: "Polymarket Gamma API",
    rawPayload: payload,
  };
}

export async function resolvePolymarket(rawUrl: string): Promise<MarketEvidence> {
  const parsed = parsePolymarketUrl(rawUrl);
  const config = getConfig();
  const base = config.POLYMARKET_GAMMA_API_BASE_URL.replace(/\/$/, "");
  const payload = await fetchJson(`${base}/${parsed.kind === "market" || parsed.eventSlug ? "markets" : "events"}/slug/${encodeURIComponent(parsed.slug)}`);
  if (parsed.eventSlug) {
    if (!payload || typeof payload !== "object") throw new ProviderError("PROVIDER_INVALID_MARKET", "The provider returned an invalid market object.", 502);
    const market = payload as Record<string, unknown>;
    const events = market.events;
    const parentEvent = Array.isArray(events)
      ? events.find((item) => item && typeof item === "object" && stringField((item as Record<string, unknown>).slug) === parsed.eventSlug) as Record<string, unknown> | undefined
      : undefined;
    if (stringField(market.slug) !== parsed.slug || !parentEvent) {
      throw new ProviderError("MARKET_EVENT_MISMATCH", "The requested Polymarket market is not part of that event.", 422);
    }
    return marketFromPayload(payload, parsed.canonicalUrl, parentEvent);
  }
  if (parsed.kind === "market") return marketFromPayload(payload, parsed.canonicalUrl);
  if (!payload || typeof payload !== "object") throw new ProviderError("PROVIDER_INVALID_EVENT", "The provider returned an invalid event object.", 502);
  const event = payload as Record<string, unknown>;
  const markets = event.markets;
  if (!Array.isArray(markets) || markets.length !== 1) {
    throw new ProviderError("EVENT_NOT_SINGLE_MARKET", "This event contains multiple markets; choose one market URL for a precise comparison.", 422);
  }
  const market = markets[0] as Record<string, unknown>;
  const sourceHost = configuredHosts(config.POLYMARKET_ALLOWED_HOSTS)[0];
  const sourceUrl = `https://${sourceHost}/market/${stringField(market.slug, parsed.slug)}`;
  return marketFromPayload(payload === market ? payload : market, sourceUrl, event);
}
