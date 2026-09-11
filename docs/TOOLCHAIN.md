# Toolchain

Versions captured during the 2026-09-09 release verification:

| Tool | Version |
|---|---|
| OS | Ubuntu 26.04 |
| Node | 20.20.2 |
| npm | 10.8.2 |
| pnpm | 9.15.4 |
| Python | 3.14.4 |
| PM2 | 7.0.1 |
| Next.js | 16.3.4 |
| React / React DOM | 19.2.8 |
| TypeScript | 5.9.3 |
| GenLayerJS | 1.1.8 |
| GenLayer CLI | 0.39.2 |
| genlayer-test | 0.29.2 |
| genvm-linter | 0.11.0 |
| Playwright Test | 1.63.0 |
| Playwright CLI | 0.1.19 |
| Chromium | Playwright-managed Chromium, installed and used in QA |
| GitHub Spec Kit | 1.0.1 |
| Ponytail plugin | 4.9.0 |
| UI/UX Pro Max | `uipro` 2.15.0; local skill initialized and persisted design system |

## Required systems

- Spec Kit was initialized with the current Codex integration and used for
  constitution, specification, clarification, planning, tasks, analysis, and
  convergence artifacts under `.specify/` and `specs/`.
- Ponytail full mode constrained the implementation toward one process,
  standard platform APIs, bounded scope, and deletion of unused infrastructure.
- UI/UX Pro Max produced `design-system/eventum/MASTER.md`; the interface uses
  its editorial/institutional direction, restrained palette, type hierarchy,
  focus guidance, and responsive density choices.
- Playwright Test and Chromium run real production-build browser checks.

Install/recheck instructions change over time; use the current upstream
documentation before upgrading these tools. No tool installer was permitted to
overwrite another application or server configuration.
