# AGENTS.md

## Working approach
- Think before acting: state assumptions, surface uncertainty, call out tradeoffs, and ask when requirements are unclear.
- Keep it simple: do the minimum that solves the problem; avoid speculative features, premature abstractions, extra configurability, and impossible-case handling.
- Make surgical changes: touch only what the request requires, match existing style, avoid unrelated refactors, and only remove unused code created by your own changes.
- Work toward verifiable goals: define success criteria, keep a short plan for multi-step tasks, and verify with tests or checks before calling work done.

## Repository map
- `ideas/` contains generated Bizidea report artifacts.
- `website/` contains the Astro site that renders reports.
- `.github/agents/` contains custom workflow agents.

## Website workflow
- Use `website/` for frontend work.
- After changing website code or report schemas, validate from `website/` with `npm run build` when dependencies are installed.

## YAML schema conventions
- All pipeline artifacts are YAML files (`news.yaml`, `idea.yaml`, `research.yaml`, `business-plan.yaml`, `financial-model.yaml`, `index.yaml`).
- Prefer descriptive camelCase field names.
- Include units in numeric field names where helpful, such as `fundingRangeUsd`, `revenueK`, `marginPct`, or `headcountEop`.
- Follow [.github/agents/yaml-syntax.md](.github/agents/yaml-syntax.md) for indentation, quoting, block-vs-flow style, and multi-line string rules.