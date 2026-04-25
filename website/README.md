# Bizidea website

Static site (Astro) that renders the YAML dossiers under `../ideas/<run>/` using
the WIRED-inspired design system in [`../DESIGN.md`](../DESIGN.md).

## Local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

`npm run build` first runs `scripts/check-ideas.mjs`, which fails fast if any
`ideas/<run>/` folder is missing one of the six required YAML files.

## Deploy

Pushed to GitHub Pages by [`.github/workflows/deploy-website.yml`](../.github/workflows/deploy-website.yml)
on every push to `main` that touches `website/**` or `ideas/**`. Repo settings
must have **Pages → Source: GitHub Actions** enabled.

Project pages publish under `https://<user>.github.io/<repo>/`. The workflow
sets `BASE_PATH=/<repo>` automatically. For a custom domain, set `BASE_PATH=/`
and update `SITE_URL` in the workflow.

## Fonts

Defaults to OSS fallbacks (Playfair Display, Lora, Inter, JetBrains Mono — all
documented in `DESIGN.md`). To use the proprietary Wired families, drop the
licensed font files into `public/fonts/` and add `@font-face` declarations
that point at them; the CSS variables in `src/styles/tokens.css` already list
the proprietary names first in each stack.

## Architecture

- Astro 5 static output, zero client JS except the lazy Mermaid loader on
  pages that contain diagrams.
- `src/content/config.ts` defines the `ideas` content collection. The custom
  loader in `src/content/ideas-loader.ts` walks `../ideas/*/index.yaml`,
  parses each with `js-yaml`, and validates against the Zod schema mirroring
  the `Reporter` agent's output.
- Stage YAMLs (`news`, `idea`, `research`, `business-plan`, `financial-model`)
  are loaded lazily inside the detail page via `loadStageFiles(runId)`.
- Visual primitives live in `src/components/` (Kicker, Headline, Ribbon, Rule,
  StoryTile, RatingBlock, FactRow, Mermaid).
