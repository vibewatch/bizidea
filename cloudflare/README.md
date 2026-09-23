# Bizidea Cloudflare Scheduler

This Worker uses a Cloudflare Cron Trigger to dispatch the repository's Daily Bizidea run workflow through GitHub's `workflow_dispatch` API.

The Worker runs at `07:00 UTC` every day, matching the previous GitHub Actions schedule. The GitHub Actions cron in `.github/workflows/bizidea.yml` is commented out so Cloudflare is the only automatic scheduler.

## Deploy

```bash
cd cloudflare
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO
npx wrangler deploy
```

Use `vibewatch/bizidea` for `GITHUB_REPO`. `GITHUB_TOKEN` should be a fine-grained GitHub PAT with `Actions: Read and write` access on this repository.

Adjust `BIZIDEA_CAP`, `BIZIDEA_TIME_WINDOW`, `BIZIDEA_MODEL`, or `GITHUB_REF` in `wrangler.toml` if the scheduled run should use different workflow inputs. The default analysis model is `gpt-6-luna`; supported overrides are `gpt-5.6-luna`, `gpt-6-sol`, and `gpt-5.4`. Chinese localization independently uses GPT-6 Luna for both the validated draft and source-anchored editorial pass.