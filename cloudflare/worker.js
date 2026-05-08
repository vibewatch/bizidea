/**
 * Bizidea Scheduler - Cloudflare Worker
 *
 * A Cron Trigger dispatches the Daily Bizidea run workflow from outside
 * GitHub Actions. This keeps scheduling in Cloudflare while preserving the
 * existing workflow_dispatch path for manual runs.
 *
 * Required secrets (set via `wrangler secret put`):
 *   GITHUB_TOKEN - fine-grained PAT with Actions: Read & Write on the repo
 *   GITHUB_REPO  - owner/repo string, e.g. "vibewatch/bizidea"
 *
 * Optional vars (configured in wrangler.toml):
 *   GITHUB_REF = "main"
 *   BIZIDEA_CAP = "5"
 *   BIZIDEA_TIME_WINDOW = "yesterday"
 *   BIZIDEA_MODEL = "gpt-5.4"  (allowed: gpt-5.4, claude-opus-4.6, claude-sonnet-4.6)
 */

const WORKFLOW = "bizidea.yml";
const DEFAULT_REF = "main";
const DEFAULT_CAP = "5";
const DEFAULT_TIME_WINDOW = "yesterday";
const DEFAULT_MODEL = "gpt-5.4";

const MODEL_EFFECTS = {
  "gpt-5.4": "xhigh",
  "claude-opus-4.6": "high",
  "claude-sonnet-4.6": "high",
};

export default {
  async scheduled(event, env, _ctx) {
    const now = new Date(event.scheduledTime);
    const ref = env.GITHUB_REF || DEFAULT_REF;
    const inputs = resolveInputs(env);

    assertRequired(env.GITHUB_TOKEN, "GITHUB_TOKEN");
    assertRequired(env.GITHUB_REPO, "GITHUB_REPO");

    console.log(
      `[${now.toISOString()}] Dispatching ${WORKFLOW} on ${ref}: cap=${inputs.cap}, timeWindow=${JSON.stringify(inputs.timeWindow)}, model=${inputs.model}, effect=${inputs.effect}`,
    );

    await dispatchWorkflow(env.GITHUB_TOKEN, env.GITHUB_REPO, WORKFLOW, ref, inputs);
    console.log(`Dispatched ${WORKFLOW} OK`);
  },
};

function resolveInputs(env) {
  const cap = String(env.BIZIDEA_CAP || DEFAULT_CAP);
  const timeWindow = String(env.BIZIDEA_TIME_WINDOW || DEFAULT_TIME_WINDOW);
  const model = String(env.BIZIDEA_MODEL || DEFAULT_MODEL);

  if (!/^[1-5]$/.test(cap)) {
    throw new Error(`Invalid BIZIDEA_CAP ${JSON.stringify(cap)}; expected 1-5`);
  }

  if (timeWindow.length > 80 || !/^[A-Za-z0-9][A-Za-z0-9 .,/_:+-]*$/.test(timeWindow)) {
    throw new Error(
      `Invalid BIZIDEA_TIME_WINDOW ${JSON.stringify(timeWindow)}; use a short plain-text phrase`,
    );
  }

  const effect = MODEL_EFFECTS[model];
  if (!effect) {
    throw new Error(
      `Invalid BIZIDEA_MODEL ${JSON.stringify(model)}; allowed: ${Object.keys(MODEL_EFFECTS).join(", ")}`,
    );
  }

  return { cap, timeWindow, model, effect };
}

function assertRequired(value, name) {
  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }
}

async function dispatchWorkflow(token, repo, workflow, ref, inputs) {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "bizidea-cloudflare-scheduler",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref, inputs }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
}