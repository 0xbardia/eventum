# Eventum pre-submission audit (historical snapshot)

Audit date: 2026-09-09 UTC  
Auditor mode: skeptical GenLayer review, contract/security review, backend and
frontend QA, Chromium QA, and release verification.

This file preserves the earlier review narrative. It is not the final release
status; the current release gates and evidence are in
[`artifacts/final/final-release-gates.md`](../artifacts/final/final-release-gates.md).

## A. Status at this audit snapshot

Historical status: `SUBMISSION_READY`

P0 findings: 0  
P1 findings: 0  
GenLayer necessity: STRONG  
Final live contract probe at that time: PASS at `2026-09-09T03:17:20Z`  
Final app process: PM2 `eventum` online

The address supplied as the prior expected deployment,
`0x7809d131DC5b5206037F9B5d77265b35AdD1d6Fc`, is superseded. Direct Mode
reproduced an unsafe many-to-one aggregation result, so the smallest safe
contract fix was deployed to a replacement address. The application and all
current evidence at that time used the replacement below. The current
operator-deployed address is recorded in the final evidence instead.

## B. Rejection verdict

Would a skeptical GenLayer reviewer have a credible evidence-backed reason to
reject Eventum? **NO.**

The protocol judgment is executed and independently checked in the Intelligent
Contract, persisted in finalized Studionet state, consumed by the application,
and exposed with structured safety/mapping/evidence fields. The remaining
risks—one provider, provider field completeness, shared public RPC quota,
permissionless append-only growth, and natural-language ambiguity—are explicit
P2 limitations and are not marketed as solved capabilities.

The earlier R1–R24 attack is preserved in the original audit workspace; the
current focused security regression evidence is
[`artifacts/final/security-regression.md`](../artifacts/final/security-regression.md).

## C. GenLayer necessity

**STRONG.**

Eventum is not a centralized LLM wrapper. The backend resolves public provider
evidence and prepares transaction arguments; it has no endpoint or boolean
field that can declare a relationship. `contracts/eventum.py` constructs the
quoted evidence prompt, runs `gl.nondet.exec_prompt`, executes the current
`gl.vm.run_nondet_unsafe` leader/validator path, validates stable semantic
fields, derives deterministic identity, and stores the relationship. A normal
deterministic contract cannot interpret heterogeneous natural-language
resolution rules, and one API operator would be the sole semantic authority.

The current deployment transaction returned `FINALIZED / MAJORITY_AGREE`; the
fresh current state has no comparison yet because live write authority was not
available during the final pass.

## D. Contract

- File: [`contracts/eventum.py`](../contracts/eventum.py)
- SHA-256: `7d45c0497d3b1466aace1b9b3f8c216ae423331f110f8d618f44a7edbb5b795a`
- Public methods: 13 total; 11 views, 2 writes
- Historical protocol version: `eventum/1.0.0` (pre-v1.1.1 audit)
- Comparison version: `1.0.0`
- Contract tests: 35 Direct Mode cases, all passed
- Static: `genvm-linter` lint and validation passed; ABI schema generated

The contract stores immutable content-addressed snapshots, monotonic versions,
canonical pair indexes, immutable comparisons, inverse directional mappings,
bounded reason/difference evidence, and direct graph edges. `safe_to_aggregate`
requires `EQUIVALENT`, a contract-derived canonical identity, equal outcome
cardinality, complete outcome coverage, and a one-to-one mapping.

The many-to-one aggregation defect was reproduced before the fix, covered by a
regression test, and is recorded in Spec Kit analysis A5. No contract source
changed after the replacement deployment; later changes were application,
documentation, and test-only hardening.

Method and invariant details:

- [`current-contract-methods.md`](../artifacts/final/current-contract-methods.md)
- [`current-contract-read-matrix.md`](../artifacts/final/current-contract-read-matrix.md)
- [`security-regression.md`](../artifacts/final/security-regression.md)

## E. Contract deployment

| Field | Verified value |
|---|---|
| Network | Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Address | `0x04435B28bA9c57A7abFA1eb6b804218fca67249c` |
| Deployment transaction | `0x08e4342b23b83c5d024917f8fd9bc19944bdd7f80feaab885c79d9fbcd5a90a4` |
| Deployment execution hash | `0x8b6e24bbc46e60a03a14cd47778fecf5bc7afc2696eb813e7d0707f70199f2a9` |
| Deployment lifecycle | `FINALIZED / MAJORITY_AGREE` |
| Source match | `getContractCode` byte-for-byte equal to local source |
| Verified at | `2026-09-09T22:53:08Z` final current-contract pass |

The deployment record is [`deployments/studionet.json`](../deployments/studionet.json).
The durable Studio read/write matrix is
[`docs/STUDIO_VERIFICATION.md`](STUDIO_VERIFICATION.md).

## F. Read/write verification

This pre-submission audit records the superseded `0x04435B28bA9c57A7abFA1eb6b804218fca67249c`
deployment. All 11 public reads were run against that finalized deployment
with GenLayerJS `1.1.8` and `TransactionHashVariant.LATEST_FINAL`; all passed.
That historical fresh deployment returned zero counts and expected not-found
errors for absent IDs:

`get_protocol_version`, `get_market_count`, `get_comparison_count`,
`get_market_snapshot`, `get_latest_market_snapshot`, `get_market_ids`,
`get_comparison`, `get_latest_comparison`, `get_relationship`,
`get_comparison_ids`, and `get_graph_edges`.

Meaningful live writes were not submitted to that superseded deployment in the
historical pass because the available signing authority had zero balance.
Current submitted-deployment write evidence is maintained in
`docs/STUDIO_VERIFICATION.md` and `deployments/studionet.json`.

The prior fixture writes below are historical evidence only, not current state:

| Write | Result |
|---|---|
| `register_market_snapshot` A | finalized majority agreement; snapshot A persisted; count 1 |
| `register_market_snapshot` B | finalized majority agreement; snapshot B persisted; count 2 |
| `compare_markets(A,B,1.0.0)` | finalized majority agreement; comparison C persisted; count 1; direct graph edge |

Exact arguments, transaction IDs, execution hashes, and resulting IDs are in
`docs/STUDIO_VERIFICATION.md`.

## G. Semantic safety

The taxonomy preserves fully equivalent, conditional, one-way implication,
partial overlap, conflict, temporal/source/outcome mismatch, unrelated, and
ambiguous states. Reason codes and material differences explain the result;
there is no protocol confidence percentage.

Market content is untrusted evidence. The prompt puts it between explicit
delimiters, prohibits evidence instructions from redefining the task, requires
an exact JSON shape, limits enums/arrays/text, rejects invented outcomes and
canonical keys, and independently compares leader/validator stable fields.
Malformed or inconclusive output becomes `AMBIGUOUS` or fails without state
corruption.

Equivalent/unrelated/conflicting relations are symmetric. Subset/superset and
outcome mappings invert by direction. The graph stores direct adjudications
only; it does not perform transitive closure.

## H. Backend

The only verified production adapter is the real public Polymarket Gamma API.
It accepts canonical market URLs and single-market event URLs, normalizes title,
description/rules, outcomes, dates, resolution source, condition/event fields,
retrieval time, and source hash, and labels previews as offchain. Missing
deadline/clarification/canonical identity fields remain empty rather than
invented; safe aggregation remains conservative.

The backend uses strict Zod request schemas, 64 KiB streaming body limits,
provider host/DNS/address allowlisting, private/link-local/metadata rejection,
same-host HTTPS redirect checks, timeout/response-size/content-type controls,
safe typed errors, atomic permission-restricted cache persistence, and
rate-limited provider/RPC-backed API routes. It never overrides finalized
onchain state.

Backend tests: 11 backend cases plus 1 frontend-format case passed via
`pnpm test`.

## I. Frontend / UX

Implemented routes: `/`, `/compare`, `/comparisons/[id]`, `/markets`,
`/markets/[id]`, `/graph`, `/docs`, and `/status`.

The core flow is real provider preview → immutable snapshot arguments → EIP-1193
wallet → finalized register/compare transactions → finalized contract read →
structured result/permalink/direct graph edge. The UI exposes relationship,
safe-to-compare, safe-to-aggregate, outcome mapping, differences, reasons,
evidence IDs/hashes, transaction lifecycle, contract address, and status.

Wallet states distinguish absent/disconnected, wrong chain, signature/rejection,
submitted, consensus pending, finalized, and failed. Simulated wrong-chain and
wallet-rejection tests pass; no browser test claims a write without a real
wallet approval and finalized receipt.

UI/UX Pro Max review found an editorial market-infrastructure interface rather
than an AI-template aesthetic: restrained navy/cream/orange palette, strong
type hierarchy, intentional spacing, semantic color, accessible labels/focus,
purposeful motion, and mobile fallback/list behavior. No fake metrics, logos,
liquidity, adoption, or generic confidence score is shown.

## J. Playwright

The final production Chromium sweep passed 27 tests with 9 intentional skips
across 1440×900, 1280×800, 390×844, and 360×800. It visited the primary
routes, monitored page errors, console errors, failed requests, HTTP failures,
and horizontal overflow, and captured screenshots in `artifacts/qa/`. The
skips are the unavailable browser wallet and absent finalized records in the
fresh contract; the real Polymarket preview and wallet failure fixtures ran.

The durable current record is
[`artifacts/final/production-playwright.md`](../artifacts/final/production-playwright.md).

## K. Claim truth

Claim audit result: no unsupported adoption, liquidity, platform-coverage,
trading, arbitrage, real-time, third-party-audit, or shipped-agent-API claims
remain. Polymarket Gamma is named as the only verified provider. Controlled
Studio fixtures are labeled as controlled verification data. The absolute
landing phrase about prompt injection was softened to describe the actual
evidence boundary rather than imply perfect model security.

See [`claim-truth-matrix.md`](../artifacts/audit/claim-truth-matrix.md).

## L. Security severity

- P0: 0
- P1: 0
- P2: documented residuals only — shared public RPC quota, provider field
  completeness/provenance, permissionless append-only storage growth, and the
  inherent possibility of ambiguous natural-language adjudication
- P3: no release-significant finding

The internal security review is not a third-party audit. Full threat surfaces,
controls, and residual risks are in
[`docs/CONTRACT_SECURITY.md`](CONTRACT_SECURITY.md),
[`docs/THREAT_MODEL.md`](THREAT_MODEL.md), and the audit matrices.

## M. Production

- Process: PM2 `eventum`, `next start`, cwd `/root/eventum`, fork mode, online;
  unstable restarts `0` at final inspection
- Localhost port: `127.0.0.1:4187`
- Domain: `eventum.bydx.fun` resolves to this server’s public IP
  `94.156.237.122`
- HTTPS: valid Let’s Encrypt chain, HTTP→HTTPS redirect, HSTS and compatible
  headers
- Health: `/api/health` HTTP 200 with `database:true`
- Contract status: `/api/status` final serialized probe reported configured
  replacement address, Studionet/61999, `contractReachable:true`, and
  historical `eventum/1.0.0` (pre-v1.1.1 audit)
- Nginx: Eventum-only vhost proxies to 127.0.0.1:4187; config validation passed;
  unrelated hosts/processes were not changed

The shared unauthenticated Studionet RPC can return 30/minute or 500/hour rate
limits after burst traffic. The application surfaces that as unavailable and
does not hardcode green status or substitute cache state.

## N. Defects fixed during audit

1. Reproduced and fixed unsafe many-to-one outcome mapping being marked
   aggregatable; added regression coverage and redeployed exact corrected
   contract source.
2. Reproduced and fixed full buffering of oversized request streams; the JSON
   reader now cancels at 64 KiB and has a regression assertion.
3. Added the existing rate limiter to RPC-backed GET routes and removed
   duplicated POST limiter responses; route-level 429 behavior was exercised.
4. Added structured model-output, reverse-symmetry, pagination-boundary,
   missing-snapshot, oversized-text, and Unicode contract tests.
5. Reworded an absolute prompt-injection marketing claim and corrected stale
   test-count/deployment compatibility documentation.
6. Closed an IPv4-mapped IPv6 private-address SSRF edge and added a regression
   case for RFC1918-mapped literals.

No unrelated service, application, PM2 process, reverse-proxy host, database,
DNS record, certificate, or firewall configuration was changed.

## O. Remaining limitations

- Polymarket Gamma is the sole verified provider; unsupported providers are
  rejected rather than silently scraped.
- Some provider markets do not expose enough rules, deadlines, clarifications,
  or canonical identity hints; Eventum rejects or conservatively disables
  aggregation.
- Writes require a funded EIP-1193 wallet and consensus can remain pending or
  ambiguous.
- The JSON cache is a single-process operational cache, not a replicated
  indexer or PostgreSQL deployment.
- No token, staking, governance, challenge economics, Bradbury deployment,
  liquidity aggregation, market creation, or dedicated agent API ships in v1.
- The public Studionet RPC quota is not suitable for sustained high-volume
  traffic without an approved higher-quota configuration.
- Semantic consensus is not a formal proof oracle for every future
  interpretation.

## P. Final acceptance checklist

| Gate | Result |
|---|---|
| Spec Kit artifacts consistent | PASS |
| Product scope frozen for release | PASS |
| Contract source reviewed | PASS |
| Contract lint/static/schema | PASS |
| Direct Mode contract suite | PASS — 35/35 |
| Adversarial contract tests | PASS |
| Consensus/validator tests | PASS |
| Internal contract security review | PASS; no P0/P1 |
| Current contract deployed to Studionet | PASS |
| Deployed source equals tested source | PASS — exact hash |
| Every public read verified | PASS — 11/11 |
| Meaningful writes verified/finalized | PASS — 2 methods, 3 finalized writes |
| Deployment transaction finalized | PASS |
| Frontend uses real deployment | PASS |
| Real provider flow verified | PASS — Polymarket Gamma |
| Backend tests | PASS — 7 |
| Frontend unit/format test | PASS — 1 |
| Typecheck | PASS |
| Lint | PASS |
| Production build | PASS |
| Dependency audit | PASS — no high vulnerabilities |
| Local production Chromium QA | PASS |
| Production-domain Chromium QA | PASS |
| Accessibility/focus/reduced-motion review | PASS within audited scope |
| Mobile QA | PASS — 390/360 |
| Desktop QA | PASS — 1440/1280 |
| Critical console/network/runtime errors | PASS — none unexplained |
| Horizontal overflow | PASS — none observed |
| PM2 process healthy | PASS |
| DNS and HTTPS | PASS |
| Production API/contract status | PASS at final serialized probe |
| Documentation truth audit | PASS |
| Submission package | PASS |
| Skeptical GenLayer review gate | PASS |
| Optional Bradbury validation | PLANNED / not a required Studionet gate |

This historical final gate was `BLOCKED_EXTERNAL` solely because the
superseded deployment's meaningful writes could not be exercised without funded
wallet authority. Do not treat this historical audit's `SUBMISSION_READY` label as the
current release status.
