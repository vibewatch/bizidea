# YAML syntax rules

All Bizidea pipeline artifacts (`idea.yaml`, `research.yaml`,
`business-plan.yaml`, `financial-model.yaml`, `index.yaml`, and per-run
`triage.yaml`) are parsed by a
strict YAML loader (`js-yaml`) at website build time. A single malformed
scalar will fail the build for the whole repo.

Every writer agent must follow these rules.

## Quoting

- Quote any scalar value that contains `: ` (colon followed by space). YAML
  treats it as a nested mapping. Common offenders: titles, prose, milestone
  labels.
  - Bad:  `title: Joint guidance: Deploying AI systems securely`
  - Good: `title: "Joint guidance: Deploying AI systems securely"`
- Quote any scalar that starts with a YAML indicator: `-`, `?`, `:`, `>`,
  `|`, `*`, `&`, `!`, `%`, `#`, `@`, `` ` ``.
- Prefer double quotes. Escape embedded `"` as `\"` and `\` as `\\`.

## Long prose

For multi-sentence prose, use a folded block scalar (`>-`) instead of one
long single line. The `>-` strips the trailing newline and folds line breaks
into spaces.

```yaml
problem: >-
  AI coding tools are moving into high-privilege workflows. Security teams
  face a new failure mode: third-party agents can touch repos, CI, and
  environment variables without a purpose-built control layer.
```

## Sequences of mappings

Use **block style** — one key per line. Do **not** use flow style
(`- { key: value, ... }`) for citations or any entry that may contain
titles, URLs, or prose. Flow-style entries break the moment a title contains
a comma or colon-space.

```yaml
# Bad
sources:
  - { id: 1, publisher: GitHub Blog, title: Research: Quantifying impact, url: https://... }

# Good
sources:
  - id: 1
    publisher: GitHub Blog
    title: "Research: Quantifying impact"
    url: https://...
```

## Indentation and nulls

- Use 2-space indentation everywhere.
- Use `null` (not `""`) for genuinely missing optional values.

## Multi-line strings (Mermaid, code blocks)

Use a literal block scalar (`|`) to preserve newlines. Do **not** wrap the
content in Markdown fences.

```yaml
conceptDiagram:
  mermaid: |
    flowchart LR
      Leads --> Customers
      Customers --> Revenue
```

## Self-check before handoff

Deterministic YAML and minimum-fields validation is the job of
[`scripts/validate-stage.mjs`](../../scripts/validate-stage.mjs); each
specialist runs it before returning `HANDOFF`. Beyond that, when you draft a
value containing `: ` or a leading indicator (`-`, `?`, `:`, `>`, `|`,
`*`, `&`, `!`, `%`, `#`, `@`, `` ` ``), quote it before you write the file—
the validator will reject the result if `js-yaml` cannot parse it, but a
clean draft costs less than a retry.
