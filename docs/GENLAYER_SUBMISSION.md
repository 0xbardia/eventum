# GenLayer submission

## PROJECT

Eventum

## ONE-LINER

The semantic interoperability layer for prediction markets.

## PROBLEM

Independent prediction markets can describe apparently identical events while
settling under materially different dates, authorities, exceptions, thresholds,
or outcome spaces. Wording similarity is not settlement equivalence.

## SOLUTION

Eventum stores immutable market snapshots and uses a GenLayer consensus-backed
Intelligent Contract to classify direct relationships, expose outcome mappings
and material differences, and project a safe market-equivalence graph.

## WHY GENLAYER

The core input is heterogeneous natural-language resolution logic authored by
independent sources. A deterministic contract cannot interpret that evidence by
itself, while a centralized LLM API would make one operator's judgment the
authority and would not provide independent validator agreement. Eventum places
the prompt/evidence boundary, structured semantic adjudication, and stable
leader/validator agreement in the Intelligent Contract. The result is persisted
onchain and reusable by public contract readers; the backend is only a provider
adapter and transaction preparation layer. No dedicated agent API is claimed.

## PRIMARY TAG

Prediction Markets

## TAG 1

Forecast Aggregation

## TAG 2

Outcome Resolution

## CONTRACT

- address: `0x96F23489C251135965b13303A991b2B9579bdF19`
- network: Studionet, chain `61999`
- RPC: `https://studio.genlayer.com/api`
- protocol: `eventum/1.1.1`
- source hash: `4c198184c7a48485cba207c5f6037cd701e27c69c4ab76192a5bfd76803434d5`
- deployment status: final and certified
- source-bound registration: contract-derived `canonical_event_hint` and `source_evidence_hash`
- meaningful writes: `register_market_snapshot`, `compare_markets`
- write verification: the live snapshot and comparison evidence is maintained
  in the current release artifacts and is verifiable through the public app
  routes and current contract reads

## LIVE APP

https://eventum.bydx.fun

## DEMO FLOW (2–3 minutes)

1. Open `/status` and verify the real contract address and reachable protocol
   version.
2. Open `/compare`, paste two public Polymarket market URLs, and click
   “Prepare comparison” to inspect real provider evidence.
3. With a funded EIP-1193 wallet on Studionet, submit the two snapshot writes
   and comparison, wait for finalized consensus, and inspect the exact
   structured result and reusable permalink. The current live deployment
   already contains the controlled records referenced by the production QA;
   a new deployment still requires its own funded wallet gate.
4. Open `/graph` to see the direct edge. No inferred transitive edge is shown.

The recorded Studio fixture is a reproducible contract verification artifact,
not a claim of adoption, liquidity, or provider coverage.

## SECURITY

Bounded contract inputs, immutable content-derived IDs, strict output schemas,
quoted untrusted evidence, independent stable-field validation, fail-safe
ambiguity, direction-aware mappings, SSRF controls, safe request schemas,
wallet chain checks, and direct-edge graph semantics are reviewed in
`docs/CONTRACT_SECURITY.md` and `docs/THREAT_MODEL.md`.

## KNOWN LIMITATIONS

Only Polymarket Gamma is verified. Some provider markets lack enough published
rules and are rejected. A wallet is needed for writes. Bradbury validation,
challenge/revalidation economics, and multi-process indexing are not release
features. Natural-language consensus can remain ambiguous.

## ROADMAP

See `docs/ROADMAP.md`; speculative provider, token, governance, and challenge
features are not marked complete.
