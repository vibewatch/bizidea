# AGENTS.md

## Commands

| Task | Command |
|---|---|
| Run tests | `npm run check:test` |
| Build website | `npm --prefix website run build` |
| Type-check website | `npm --prefix website run typecheck` |
| Validate one stage YAML | `node scripts/validate-stage.mjs <folder> <stage>` |
| Check agent frontmatter | `npm run check:agents` |
| Check historical triage | `npm run check:triage` |
| Validate all ideas | `npm run validate:all` |
| Rebuild history index | `node scripts/ideas-index.mjs --strict` |
| Repair generated YAML | `npm --prefix website run repair:yaml` |

## Repository layout

| Path | Purpose |
|---|---|
| `ideas/` | Report artifacts — one dated folder per run; `_index.yaml` = aggregated catalog; `_triage/<ts>/` = triage decisions; `_`-prefixed paths ignored by Astro |
| `website/` | Astro site that renders reports |
| `cloudflare/` | Cloudflare Worker scheduler (dispatches `bizidea.yml` daily) |
| `.github/agents/` | Agent definitions: `Bizidea` orchestrator, stage specialists, `ZH Translator`, plus shared references (`handoff-protocol.md`, `sector-vocabulary.md`, `yaml-syntax.md`) |
| `.github/workflows/` | `bizidea.yml` (main pipeline run), `deploy.yml` (site publish on push) |
| `scripts/` | Node helpers: `ideas-index.mjs`, `dedupe-idea.mjs`, `report-dir.mjs`, `validate-stage.mjs`, `check-agent-frontmatter.mjs`, `check-triage.mjs`, `text.mjs` |

## YAML conventions

- Pipeline artifacts: `idea.yaml`, `research.yaml`, `business-plan.yaml`, `financial-model.yaml`, `index.yaml` — each with a `*.zh.yaml` Simplified Chinese sibling.
- Per-report source context belongs in `idea.yaml.sourceContext`.
- Field names: descriptive camelCase; include units where helpful (`fundingRangeUsd`, `revenueK`, `marginPct`, `headcountEop`).
- Style rules (indentation, quoting, block-vs-flow, multi-line strings): see [.github/agents/yaml-syntax.md](.github/agents/yaml-syntax.md).

## Working approach

- Think before acting: state assumptions, surface uncertainty, call out tradeoffs, ask when requirements are unclear.
- Keep it simple: do the minimum that solves the problem; avoid speculative features, premature abstractions, and impossible-case handling.
- Make surgical changes: touch only what the request requires, match existing style, avoid unrelated refactors, only remove unused code created by your own changes.
- Work toward verifiable goals: define success criteria, keep a short plan for multi-step tasks, verify with tests or checks before calling work done.