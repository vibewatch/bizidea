# AGENTS.md

## Working approach
- Think before acting: state assumptions, surface uncertainty, call out tradeoffs, and ask when requirements are unclear.
- Keep it simple: do the minimum that solves the problem; avoid speculative features, premature abstractions, extra configurability, and impossible-case handling.
- Make surgical changes: touch only what the request requires, match existing style, avoid unrelated refactors, and only remove unused code created by your own changes.
- Work toward verifiable goals: define success criteria, keep a short plan for multi-step tasks, and verify with tests or checks before calling work done.

## Repository map
- `ideas/` contains generated Bizidea report artifacts. Each report lives in its own dated folder and includes both English (`*.yaml`) and Simplified Chinese (`*.zh.yaml`) versions of the five stage artifacts. Top-level `_index.yaml` is the aggregated history catalog (rebuilt by [scripts/build-ideas-index.mjs](scripts/build-ideas-index.mjs)) used by `News Triage` to dedupe across runs. `_triage/<runTimestamp>/triage.yaml` records each daily triage decision. Folders or files prefixed with `_` are ignored by the Astro content collection.
- `website/` contains the Astro site that renders reports.
- `.github/agents/` contains custom workflow agents, including the `Bizidea` orchestrator, the per-stage specialists (`News Triage`, `Idea Generator`, `Market Researcher`, `Business Plan Writer`, `Financial Modeler`, `Reporter`), the `ZH Translator` (writes `*.zh.yaml` siblings), and the `yaml-syntax` reference.
- `.github/workflows/` includes `deploy-website.yml` (publishes the site on `main` pushes touching `website/**` or `ideas/**`) and `daily-bizidea.yml` (scheduled multi-report run).
- `scripts/` holds repo-level Node helpers: [build-ideas-index.mjs](scripts/build-ideas-index.mjs), [check-idea-dedup.mjs](scripts/check-idea-dedup.mjs), [prepare-report-folder.mjs](scripts/prepare-report-folder.mjs), and the shared [text-utils.mjs](scripts/text-utils.mjs) tokenizer used for dedupe.

## Website workflow
- Use `website/` for frontend work.
- After changing website code or report schemas, validate from `website/` with `npm run build` when dependencies are installed.

## YAML schema conventions
- All pipeline artifacts are YAML files (`idea.yaml`, `research.yaml`, `business-plan.yaml`, `financial-model.yaml`, `index.yaml`, their `*.zh.yaml` Simplified Chinese counterparts, plus per-run `_triage/<ts>/triage.yaml` and the aggregated `_index.yaml`). Per-report source context belongs in `idea.yaml.sourceContext`.
- Prefer descriptive camelCase field names.
- Include units in numeric field names where helpful, such as `fundingRangeUsd`, `revenueK`, `marginPct`, or `headcountEop`.
- Follow [.github/agents/yaml-syntax.md](.github/agents/yaml-syntax.md) for indentation, quoting, block-vs-flow style, and multi-line string rules.