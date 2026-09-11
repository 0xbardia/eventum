# Contributing to Eventum

## Setup

Use Node 20.20+, pnpm 9.15+, Python 3.14+, and Chromium. Follow the setup in
the README and keep `.env` local and permission-restricted.

## Workflow

Create a focused branch, keep the diff small, and explain the user-visible or
protocol-facing reason for the change. Do not include production credentials,
private runtime records, or raw provider payloads.

## Checks

Before opening a pull request, run the checks relevant to the change:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Contract changes additionally require the contract lint/test/schema workflow,
source-hash review, deployment provenance, and a fresh deployment certification.
Never patch a contract and continue treating an old deployment as current.

Frontend changes should include focused Playwright checks for real routes,
desktop/mobile layouts, keyboard focus, reduced motion, console/network errors,
and protocol-truth states. Do not automate repeated funded writes.

## Pull request checklist

- [ ] Scope is limited and existing flows are preserved.
- [ ] Tests and build pass.
- [ ] No secrets or private runtime data are included.
- [ ] Contract/backend semantics were not changed unintentionally.
- [ ] Browser states and responsive behavior were checked when UI changed.
- [ ] Documentation reflects verified behavior only.
