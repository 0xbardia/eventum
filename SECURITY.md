# Security policy

Eventum handles public market evidence, wallet-authorized writes, and a
consensus-backed contract. Treat private keys, seed phrases, API credentials,
cookies, session data, and production runtime records as sensitive.

## Reporting

Do not open a public issue for an undisclosed vulnerability. Report privately to
the repository maintainers through the private security-reporting mechanism
provided by the hosting organization, including reproduction steps, impact,
and a minimal proof of concept. Do not include real private credentials in a
report.

## Security-sensitive areas

- wallet target, chain checks, and transaction reconciliation;
- provider URL allowlists, SSRF defenses, response limits, and XSS-safe output;
- contract evidence bounds, structured model output, validator independence,
  and fail-closed invalid results;
- server-only environment variables and deployment configuration;
- the distinction between an application Comparison Run and persisted onchain
  Comparison.

Comparison Run mutation uses a server-issued random HttpOnly session cookie;
the JSON store keeps only its SHA-256 binding. Historical runs without a
binding are readable but read-only. Public PATCH accepts only transaction hash
claims. The server independently checks the current chain and Eventum contract,
then reads authoritative snapshot/comparison state before writing any
chain-derived run fields. Verification retries the same hash and never
resubmits a wallet transaction.

Security fixes must preserve protocol truth and should include a focused
regression test where practical. See `docs/THREAT_MODEL.md` and
`docs/CONTRACT_SECURITY.md` for the current model and controls.
