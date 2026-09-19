# Testing

## Contract

Direct Mode is the primary deterministic contract suite. It covers normal
relations, time and resolution mismatches, outcome mappings, versioning,
duplicates, reverse lookup, malformed/oversized/adversarial evidence,
leader/validator disagreement, malformed model output, safe failure, and the
non-transitive graph. The suite uses documented deterministic mocks only in
Direct Mode; mocks are never exposed on production request paths.

Commands:

```bash
pnpm contract:lint
pnpm contract:test
pnpm verify:studionet
```

## Application

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit
```

Backend tests cover canonical hashing, URL validation, SSRF address checks,
schema/body limits, cache privacy, and formatting. The production provider
path has been exercised against the real Polymarket Gamma API.

## Browser

```bash
pnpm qa:local
BASE_URL=https://eventum.bydx.fun pnpm exec playwright test
```

The Playwright suite runs Chromium against the production build at 1440x900,
1280x800, 390x844, and 360x800. It monitors page errors, console errors,
failed requests, HTTP failures, hydration/runtime failures, screenshots, deep
links, mobile navigation, unsupported-provider behavior, and horizontal
overflow. Manual release QA additionally checks keyboard focus and 125% zoom.

## Evidence rule

A green build is not a contract deployment proof. A submitted transaction is
not a finalized-write proof. Each release records source hash, transaction
hash, finalized status/result, actual read results, browser routes/viewports,
and known external limitations.

## Release run

On 2026-09-09, the final source gates passed: contract lint (13 methods), 35
Direct Mode tests, 12 backend/frontend tests, typecheck, ESLint, production
build, schema generation, and high-severity dependency audit. Local and
production Chromium route baseline passed 15 tests with 13 intentional
environment-gated skips; the recorded local production-build sweep passed 23
tests with the same 13 skips, including eight simulated wallet failure cases.
Isolated production real-provider preview, finalized comparison, and
keyboard/125% checks passed. A serialized post-release live probe returned
`get_protocol_version=eventum/1.1.1` and `get_market_count=2`; burst probes can
still hit the shared Studionet `500 requests per hour` quota, which the app
reports as unavailable rather than substituting cache state.
The later IPv4-mapped-address SSRF hardening was covered by backend regression
tests and focused production provider checks.
