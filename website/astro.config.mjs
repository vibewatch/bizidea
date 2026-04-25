import { defineConfig } from 'astro/config';

// Project pages base path. If a custom domain is attached later, set base to '/' and update SITE accordingly.
const SITE = process.env.SITE_URL || 'https://example.github.io';
const BASE = process.env.BASE_PATH ?? '/bizidea';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    syntaxHighlight: false,
  },
});
