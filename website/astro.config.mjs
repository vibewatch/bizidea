import { defineConfig } from 'astro/config';

// Project pages base path. If a custom domain is attached later, set base to '/' and update SITE accordingly.
const SITE = process.env.SITE_URL || 'https://bizidea.genisisiq.com';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [],
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    syntaxHighlight: false,
  },
});
