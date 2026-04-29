# Bizidea website

Static site (Astro) that renders the YAML dossiers under `../ideas/<run>/` using
an FT.com-inspired editorial design system (salmon paper, claret accent, Source
Serif 4 / Inter type stack) defined in [`src/styles/tokens.css`](src/styles/tokens.css).

## Local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

`npm run build` first runs `scripts/check-ideas.mjs`, which fails fast if any
`ideas/<run>/` folder is missing one of the five required YAML files, contains
unexpected YAML artifacts, or includes YAML that cannot be parsed.

YAML repair helpers are available via `npm run repair:yaml`, but they are not
part of the website build. They should run during report generation before
artifacts are committed.

## Deploy

Pushed to GitHub Pages by [`.github/workflows/deploy-website.yml`](../.github/workflows/deploy-website.yml)
on every push to `main` that touches `website/**` or `ideas/**`. Repo settings
must have **Pages → Source: GitHub Actions** enabled.

Project pages publish under `https://<user>.github.io/<repo>/`. The workflow
sets `BASE_PATH=/<repo>` automatically. For a custom domain, set `BASE_PATH=/`
and update `SITE_URL` in the workflow.

## Fonts

Typography follows the GenisisIQ stack:

- `Mona Sans` from `@font-face` in [`src/styles/tokens.css`](src/styles/tokens.css)
- `Noto Sans SC` and `JetBrains Mono` from Google Fonts in [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro)

Token stacks live in [`src/styles/tokens.css`](src/styles/tokens.css).

## Architecture

- Astro 5 static output, zero client JS except the lazy Mermaid loader on
  pages that contain diagrams.
- `src/content/config.ts` defines the `ideas` content collection. The custom
  loader in `src/content/ideas-loader.ts` walks `../ideas/*/index.yaml`,
  parses each with `js-yaml`, and validates against the Zod schema mirroring
  the `Reporter` agent's output.
- Stage YAMLs (`idea`, `research`, `business-plan`, `financial-model`)
  are loaded lazily inside the detail page via `loadStageFiles(runId)`.
- Visual primitives live in `src/components/` (Kicker, Headline, Ribbon, Rule,
  StoryTile, RatingBlock, FactRow, Mermaid).
