# API

All JSON responses use `Cache-Control: no-store`, safe error messages, and
`X-Content-Type-Options: nosniff`. Request bodies are schema-checked and
limited to 64 KiB with streaming cancellation. Provider endpoints and
RPC-backed read endpoints are rate-limited in memory using the configured
window and limit.

## Routes

| Method | Route | Authority | Result |
|---|---|---|---|
| GET | `/api/health` | local cache | liveness and cache health |
| GET | `/api/status` | finalized contract | network, address, protocol version, reachability |
| POST | `/api/markets/resolve` | real Polymarket API preview | one normalized market snapshot preview |
| POST | `/api/comparisons/prepare` | real Polymarket API preview | two previews and wallet register arguments |
| GET | `/api/markets` | finalized contract | snapshot index and records |
| GET | `/api/markets/:id` | finalized contract | one snapshot |
| GET | `/api/comparisons/:id` | finalized contract | one comparison |
| GET | `/api/graph` | finalized contract | direct edges only |

## Request examples

```bash
curl -sS https://eventum.bydx.fun/api/status
curl -sS -X POST https://eventum.bydx.fun/api/markets/resolve \
  -H 'content-type: application/json' \
  -d '{"url":"https://polymarket.com/market/<slug>"}'
```

Nested child markets are also accepted, for example
`https://polymarket.com/event/<event-slug>/<market-slug>`; a trailing slash,
query string, or fragment is removed from the returned canonical source URL.

`/api/comparisons/prepare` accepts `{ "urls": [urlA, urlB],
"comparisonVersion": "1.0.0" }`. It never claims that the preview is an
onchain snapshot. The browser must submit the returned arguments and read back
the finalized comparison.

## Error shape

```json
{"error":{"code":"UNSUPPORTED_PROVIDER","message":"Only verified Polymarket URLs are supported."}}
```

Production responses do not expose stack traces, secrets, provider payloads,
or internal exception text. Unsupported providers, malformed URLs, provider
outages, invalid JSON, oversized bodies, rate limits, stale/invalid contract
responses, and missing configuration remain distinguishable by code.
