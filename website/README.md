# Bizidea website

Static site (Astro) that renders the YAML dossiers under `../ideas/<run>/` using
an FT.com-inspired editorial design system (salmon paper, claret accent, Mona
Sans / Noto Sans SC type stack) defined in [`src/styles/tokens.css`](src/styles/tokens.css).

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

Pushed to GitHub Pages by [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
on every push to `main` that touches `website/**` or `ideas/**`. Repo settings
must have **Pages → Source: GitHub Actions** enabled.

Project pages publish under `https://<user>.github.io/<repo>/`. The workflow
sets `BASE_PATH=/<repo>` automatically. For a custom domain, set `BASE_PATH=/`
and update `SITE_URL` in the workflow.

## Fonts

Typography follows the GenisisIQ stack:

- `Mona Sans` self-hosted from [`src/assets/fonts/mona-sans.woff2`](src/assets/fonts/mona-sans.woff2), wired via `@font-face` in [`src/styles/tokens.css`](src/styles/tokens.css) and preloaded in [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro)
- `Noto Sans SC` from Google Fonts in [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro)

Token stacks live in [`src/styles/tokens.css`](src/styles/tokens.css).

## Architecture

- Astro 6 static output, zero client JS except the lazy Mermaid loader on
  pages that contain diagrams.
- `src/content.config.ts` defines the `ideas` content collection. The custom
  loader in `src/content/ideas-loader.ts` walks `../ideas/*/index.yaml`,
  parses each with `js-yaml`, and validates against the Astro content schema
  mirroring the `Reporter` agent's output.
- Stage YAMLs (`idea`, `research`, `business-plan`, `financial-model`)
  are loaded lazily inside the detail page via `loadStageFiles(runId)`.
- Visual primitives live in `src/components/` (Kicker, Headline, Ribbon, Rule,
  StoryTile, RatingBlock, FactRow, Mermaid).
