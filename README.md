# Bizidea

Bizidea is a daily, fully-automated startup-research factory. A scheduled GitHub Actions workflow invokes the **Bizidea** Copilot orchestrator, which runs one **News Triage** scan, generates and dedupes ideas from selected clusters, then starts report production for each surviving idea. Each successful topic becomes a self-contained folder of YAML artifacts spanning idea synthesis, embedded source context, market research, business plan, 3-year financial model, and a machine-readable index. The companion Astro site renders those YAMLs as an FT-style editorial reading experience and ships to GitHub Pages on every push.

Live site: <https://bizidea.genisisiq.com>

## How it works

```
                ┌─────────────────────┐
   cron / UI ─▶ │ daily-bizidea.yml   │  GitHub Actions, 07:00 UTC daily
                └──────────┬──────────┘
                           │ copilot --agent Bizidea
                           ▼
                ┌─────────────────────┐
                │  Bizidea agent      │  orchestrates specialists:
                │  (.github/agents/)  │   News Triage → Idea Generator
                └──────────┬──────────┘   → dedupe → parallel report pipelines
                           │               Market Researcher → Business Plan Writer
                           │               → Financial Modeler → Reporter
                           ▼
                ┌─────────────────────┐
                │  ideas/<run-id>/    │  5 YAMLs per report
                │   idea.yaml         │
                │   research.yaml     │
                │   business-plan.yaml│
                │   financial-model.yaml
                │   index.yaml        │  (sidecar consumed by the site)
                └──────────┬──────────┘
                           │ scripts/build-ideas-index.mjs
                           ▼
                ┌─────────────────────┐
                │  ideas/_index.yaml  │  aggregated history catalog (dedupe)
                └──────────┬──────────┘
                           │ git commit + push
                           ▼
                ┌─────────────────────┐
                │ deploy-website.yml  │  Astro build → GitHub Pages
                └─────────────────────┘
```

## Repository layout

| Path | Purpose |
|---|---|
| `ideas/` | Generated report artifacts. Each dated folder is one startup package. `_index.yaml` is the aggregated history (rebuilt by [scripts/build-ideas-index.mjs](scripts/build-ideas-index.mjs)). `_triage/<runTimestamp>/triage.yaml` records each daily triage. Underscore-prefixed paths are ignored by the Astro content collection. |
| `website/` | [Astro 5](https://astro.build) site that renders reports as editorial pages. |
| `.github/agents/` | Custom Copilot agent definitions: `Bizidea` (the orchestrator) plus `News Triage`, `Idea Generator`, `Market Researcher`, `Business Plan Writer`, `Financial Modeler`, `Reporter`, and `yaml-syntax`. |
| `.github/workflows/` | `daily-bizidea.yml` (scheduled multi-report run) and `deploy-website.yml` (publishes the site on `main` pushes touching `website/**` or `ideas/**`). |
| `scripts/` | Repo-level deterministic helpers: `build-ideas-index.mjs`, `check-idea-dedup.mjs`, and `prepare-report-folder.mjs`. |
| [FLOW.md](FLOW.md) | Mermaid diagram of the current agent-orchestrated pipeline. |
| [AGENTS.md](AGENTS.md) | Unified coding-agent instructions (working approach, repo map, YAML conventions). |

## YAML schema conventions

All pipeline artifacts are YAML files (`idea.yaml`, `research.yaml`, `business-plan.yaml`, `financial-model.yaml`, `index.yaml`, plus per-run `_triage/<ts>/triage.yaml` and the aggregated `_index.yaml`).

- Prefer descriptive **camelCase** field names.
- Include units in numeric field names where helpful: `fundingRangeUsd`, `revenueK`, `marginPct`, `headcountEop`.
- Follow [.github/agents/yaml-syntax.md](.github/agents/yaml-syntax.md) for indentation, quoting, block-vs-flow style, and multi-line strings.

## Local development

### Website

```bash
cd website
npm ci
npm run dev      # http://localhost:4321/
npm run build    # static output → website/dist/
```

The build pipeline runs `check-ideas`, `expand-flow`, and `quote-colons` before `astro build`. See [website/scripts/](website/scripts/).

### Rebuild the dedupe index

```bash
npm run build:ideas-index
```

### Helper scripts

The `Bizidea` agent owns orchestration, but uses small deterministic scripts for repeatable file-system work:

| Script | Purpose |
|---|---|
| `scripts/build-ideas-index.mjs` | Rebuilds `ideas/_index.yaml` from completed report folders. |
| `scripts/check-idea-dedup.mjs` | Compares a newly generated `idea.yaml` against `_index.yaml` and can delete duplicate partial folders. |
| `scripts/prepare-report-folder.mjs` | Creates a stable `ideas/<runTimestamp>-<slug>/` folder for one selected idea. |

## Running the pipeline

The agent-orchestrated pipeline runs in CI on a daily schedule, but you can also trigger it manually:

- **Manually via GitHub UI**: Actions → *Daily Bizidea run* → *Run workflow* (inputs: `cap`, `timeWindow`).
- **Locally via Copilot CLI** (requires a Copilot license; the `Bizidea` agent orchestrates all stages):

  ```bash
  npm install -g @github/copilot
  copilot --yolo --agent Bizidea -p "Scan yesterday's startup news and generate up to 5 non-duplicate startup reports."
  ```

The important sequencing rule is: `News Triage` runs once, `Idea Generator` creates and dedupes ideas from that triage output, and only then does `Bizidea` start parallel per-idea report pipelines (`research → business plan → financial model → report`).

## Deployment

`deploy-website.yml` builds the Astro site and publishes to GitHub Pages whenever `main` receives a push touching `website/**`, `ideas/**`, or the workflow itself. The custom domain `bizidea.genisisiq.com` is set via [website/public/CNAME](website/public/CNAME).

## Required secrets

| Secret | Used by | Purpose |
|---|---|---|
| `COPILOT_PAT` | `daily-bizidea.yml` | PAT for a Copilot-licensed account; passed as `COPILOT_GITHUB_TOKEN` to the Copilot CLI. |
| `BIZIDEA_PAT` | `daily-bizidea.yml` | PAT with repo write access for checkout/push so the resulting commit can trigger downstream deploy workflows. |

The workflow uses `contents: write`, but `BIZIDEA_PAT` is used for checkout and pushing the daily commit so downstream workflows such as Pages deploy can be triggered reliably.

## License

MIT (or your preferred license — update this section).
