# Market adapters

## Verified: Polymarket Gamma

Eventum currently supports one public production adapter:

- API base: `https://gamma-api.polymarket.com`
- market lookup: `/markets/slug/:slug`
- single-market event lookup: `/events/slug/:slug`
- source attribution: `Polymarket Gamma API`

The adapter accepts canonical `https://polymarket.com/market/<slug>`,
single-market `/event/<slug>`, and exact child-market
`/event/<event-slug>/<market-slug>` URLs. Nested URLs resolve the second slug
through Gamma's market endpoint and verify its returned parent event reference;
they never select an arbitrary child from the parent event. One-segment event
URLs containing multiple markets are rejected because silently choosing one
would change the user's evidence. A trailing slash, query string, or fragment
is removed from the canonical source URL after provider validation.

The normalizer requires a provider ID, question, description/rules, and at
least two unique outcome labels. It preserves source URL, source hash,
timestamps, provider dates, resolution source, condition ID, event/market
slugs, and outcome count. Empty provider fields remain empty; Eventum does not
invent deadlines, clarifications, or canonical identities.

The real Gamma endpoint was probed during release research and the production
resolve path was exercised with a real public market response. The controlled
onchain fixture in the Studio verification is deliberately separate from that
provider data.

## SSRF controls

The fetch path enforces HTTPS, exact allowlisted hosts, DNS resolution,
rejects loopback/private/link-local/metadata/multicast/CGNAT addresses, uses
manual same-host HTTPS redirects with a limit, an abort timeout, a byte limit,
and JSON content-type validation. Credentials, ports, unsupported or
noncanonical paths, HTML, malformed JSON, and unexpected provider shapes are
rejected; harmless query strings and fragments are never sent to Gamma and are
removed from the canonical source URL.

## Unsupported providers

Kalshi, Limitless, other Polymarket-compatible sites, and arbitrary URLs are
not claimed as supported. They receive an explicit unsupported-provider
response. A future adapter must have a documented public API, normalization
tests, legal/public access, provenance behavior, and SSRF review before being
listed here.
