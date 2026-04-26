# Bizidea

Bizidea is a daily, fully-automated startup-research factory. A scheduled GitHub Actions workflow runs the **Bizidea** orchestrator agent (via the GitHub Copilot CLI), which scans the day's startup news, dedupes against previously generated reports, and produces up to N self-contained startup packages — each one a folder of YAML artifacts spanning news triage, idea synthesis, market research, business plan, 3-year financial model, and a machine-readable index. The companion Astro site renders those YAMLs as an FT-style editorial reading experience and ships to GitHub Pages on every push.

Live site: <https://bizidea.genisisiq.com>

## How it works

```
                ┌─────────────────────┐
   cron / UI ─▶ │ daily-bizidea.yml   │  GitHub Actions, 07:00 UTC daily
                └──────────┬──────────┘
                           │ copilot --yolo --agent Bizidea -p "..."
                           ▼
                ┌─────────────────────┐
                │  Bizidea agent      │  orchestrates sub-agents:
                │  (.github/agents/)  │   News Triage → News Scout
                └──────────┬──────────┘   → Idea Generator → Market Researcher
                           │               → Business Plan Writer
                           │               → Financial Modeler → Reporter
                           ▼
                ┌─────────────────────┐
                │  ideas/<run-id>/    │  6 YAMLs per report
                │   news.yaml         │
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
| `.github/agents/` | Custom Copilot agent definitions: `Bizidea` (orchestrator) plus `News Triage`, `News Scout`, `Idea Generator`, `Market Researcher`, `Business Plan Writer`, `Financial Modeler`, `Reporter`, and `yaml-syntax`. |
| `.github/workflows/` | `daily-bizidea.yml` (scheduled multi-report run) and `deploy-website.yml` (publishes the site on `main` pushes touching `website/**` or `ideas/**`). |
| `scripts/` | Repo-level Node scripts. Currently `build-ideas-index.mjs` rebuilds the dedupe catalog. |
| [AGENTS.md](AGENTS.md) | Unified coding-agent instructions (working approach, repo map, YAML conventions). |

## YAML schema conventions

All pipeline artifacts are YAML files (`news.yaml`, `idea.yaml`, `research.yaml`, `business-plan.yaml`, `financial-model.yaml`, `index.yaml`, plus per-run `_triage/<ts>/triage.yaml` and the aggregated `_index.yaml`).

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

## Running the orchestrator

The agent runs in CI on a daily schedule, but you can also trigger it manually:

- **Manually via GitHub UI**: Actions → *Daily Bizidea run* → *Run workflow* (inputs: `cap`, `timeWindow`).
- **Locally via Copilot CLI** (requires a Copilot license):

  ```bash
  npm install -g @github/copilot
  copilot --yolo --agent Bizidea -p "Scan yesterday's startup news and generate up to 5 non-duplicate startup reports."
  ```

## Deployment

`deploy-website.yml` builds the Astro site and publishes to GitHub Pages whenever `main` receives a push touching `website/**`, `ideas/**`, or the workflow itself. The custom domain `bizidea.genisisiq.com` is set via [website/public/CNAME](website/public/CNAME).

## Required secrets

| Secret | Used by | Purpose |
|---|---|---|
| `COPILOT_PAT` | `daily-bizidea.yml` | PAT for a Copilot-licensed account; passed as `COPILOT_GITHUB_TOKEN` to the Copilot CLI. |

The repo's default `GITHUB_TOKEN` (with `contents: write`) handles checkout and pushing the daily commit — no user PAT needed for git operations.

## License

MIT (or your preferred license — update this section).
