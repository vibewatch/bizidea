# Sector vocabulary

Closed list. `News Triage`, `Idea Generator`, and any future categorization
agent MUST pick exactly one entry per cluster/idea. New sectors are added
here first, then referenced from the agents — never inlined into individual
agents, because the website's sector-grouping logic and dedup rules assume a
single source of truth.

## Allowed values

- `climate-tech`
- `ai-infra`
- `fintech`
- `health-tech`
- `dev-tools`
- `consumer`
- `industrial`
- `defense`
- `bio`
- `crypto`
- `edu`
- `other`

## Rules

- Lowercase, kebab-case, ASCII only.
- `other` is the deliberate escape hatch — use it when nothing else fits, not
  when the agent is unsure between two real sectors. Pick the better fit.
- Triage's `sectorHint` is advisory; `Idea Generator` may override it when
  the final idea clearly fits a different sector, but must still pick from
  this list.
- Translation agents must NOT translate this value (it is a website CSS class
  and grouping key). Keep it verbatim in `*.zh.yaml`.
