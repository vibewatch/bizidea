# Retired Bizidea Cloudflare Dispatcher

GitHub Actions now owns the daily schedule in `.github/workflows/bizidea.yml`, running at `07:00 UTC`. This Worker is retained only as a reference implementation for explicitly dispatching the workflow through GitHub's `workflow_dispatch` API.

`wrangler.toml` intentionally declares no Cron Trigger. If an older deployment still has the former `00:00`, `08:00`, and `16:00 UTC` triggers, redeploy the current configuration to remove them and prevent duplicate runs.

## Optional explicit deployment

```bash
cd cloudflare
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO
npx wrangler deploy
```

Use `vibewatch/bizidea` for `GITHUB_REPO`. `GITHUB_TOKEN` should be a fine-grained GitHub PAT with `Actions: Read and write` access on this repository.

Adjust `BIZIDEA_CAP`, `BIZIDEA_TIME_WINDOW`, or `GITHUB_REF` in `wrangler.toml` if this helper is reused. Every custom agent is explicitly pinned to GPT-6 Luna, and pipeline runs use `xhigh` reasoning.