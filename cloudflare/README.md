# Bizidea Cloudflare Scheduler

This Worker uses a Cloudflare Cron Trigger to dispatch the repository's Daily Bizidea run workflow through GitHub's `workflow_dispatch` API.

The Worker runs every eight hours at `00:00`, `08:00`, and `16:00 UTC`. The GitHub Actions cron in `.github/workflows/bizidea.yml` is commented out so Cloudflare is the only automatic scheduler.

## Deploy

```bash
cd cloudflare
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO
npx wrangler deploy
```

Use `vibewatch/bizidea` for `GITHUB_REPO`. `GITHUB_TOKEN` should be a fine-grained GitHub PAT with `Actions: Read and write` access on this repository.

Adjust `BIZIDEA_CAP`, `BIZIDEA_TIME_WINDOW`, or `GITHUB_REF` in `wrangler.toml` if the scheduled run should use different workflow inputs. Every custom agent is explicitly pinned to GPT-6 Luna, and pipeline runs use `xhigh` reasoning.