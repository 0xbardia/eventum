# Threat model

## Assets

- immutable snapshot and comparison state
- source hashes and provenance
- relationship direction and outcome mappings
- wallet transaction intent
- contract address/network configuration
- provider/API availability and user privacy

## Actors

- ordinary researcher/integrator
- malicious market author controlling title/rules/description
- malicious or compromised provider response
- malicious browser/client request
- unavailable or disagreeing GenLayer validators
- operator accidentally deploying stale configuration

## Trust boundaries

Browser → backend, backend → provider, backend → contract arguments, contract
prompt → evidence, leader → validator, RPC/Studio → application, and cache →
public response are all explicit boundaries. Only validated finalized contract
state is protocol authority.

## Main controls

- strict schemas and bounded request bodies
- streaming request-body cancellation at 64 KiB and in-process limits on
  provider/RPC-backed API routes
- provider allowlist, DNS/address validation, redirect checks, timeout and size
  limits
- text-only rendering of market content and safe external links
- no private env variables in client bundles
- no silent wallet network switching
- quoted evidence and exact JSON/enums in the contract prompt
- independent stable-field validation and fail-safe ambiguity
- deterministic IDs, immutable snapshots, sorted pair keys, inverse mappings
- direct graph edges only
- no cache override of finalized contract reads

## Residual risk

Semantic consensus is not a proof oracle for every future interpretation.
Ambiguity, provider incompleteness, and a single-process cache remain known
limitations and are surfaced rather than hidden.
