#!/usr/bin/env node
// Per-stage minimum-fields gate. Each Bizidea specialist agent must run this
// after writing its artifact and before returning the HANDOFF block. The
// orchestrator also runs it during gate-and-retry.
//
// This is intentionally a structural check, not the full Zod schema: it
// matches the artifact-gates table in `.github/agents/bizidea.agent.md` so
// agents can self-correct before the website's Zod validation runs in CI.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import yaml from 'js-yaml';

const STAGES = {
  triage: {
    file: 'triage.yaml',
    requiredKeys: ['runDate', 'timeWindow', 'clustersFound', 'selectedCount', 'clusters'],
  },
  idea: {
    file: 'idea.yaml',
    requiredKeys: ['slug', 'date', 'pitch', 'sourceContext', 'startupThesis', 'goToMarketSeed', 'solution'],
  },
  research: {
    file: 'research.yaml',
    requiredKeys: ['slug', 'date', 'market', 'competitors', 'researchCoverage', 'deduplication', 'evidenceCorpus', 'sources'],
    requiredNested: [['reportMemo', 'incumbentThesis']],
    requiredArrays: [
      // (path, minLength) — incumbentThesis must be a non-empty array per the
      // Market Researcher schema rule "should contain 3–5 entries".
      [['reportMemo', 'incumbentThesis'], 1],
    ],
  },
  'business-plan': {
    file: 'business-plan.yaml',
    requiredKeys: ['slug', 'date', 'executiveSummary', 'strategicChoices', 'market', 'product', 'gtm', 'milestones', 'fundingAsk', 'investorMemo', 'operatingAssumptions'],
  },
  'financial-model': {
    file: 'financial-model.yaml',
    requiredKeys: ['slug', 'date', 'totals', 'unitEconomics', 'fundingAsk', 'modelSanity'],
  },
  index: {
    file: 'index.yaml',
    requiredKeys: ['slug', 'date', 'pitch', 'rating', 'files', 'financials'],
  },
};

function usage() {
  const stages = Object.keys(STAGES).join(', ');
  console.error(`Usage: node scripts/validate-stage.mjs <reportFolder> <stage>`);
  console.error(`  stage: one of ${stages}`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const folder = resolve(args[0]);
const stage = args[1];
const spec = STAGES[stage];
if (!spec) usage();

const filePath = join(folder, spec.file);
if (!existsSync(filePath)) {
  console.error(`[validate-stage] missing file: ${filePath}`);
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(filePath, 'utf8');
} catch (err) {
  console.error(`[validate-stage] cannot read ${filePath}: ${err.message}`);
  process.exit(1);
}

if (raw.trim().length === 0) {
  console.error(`[validate-stage] ${filePath} is empty`);
  process.exit(1);
}

let parsed;
try {
  parsed = yaml.load(raw);
} catch (err) {
  console.error(`[validate-stage] ${filePath} is not valid YAML: ${err.message}`);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  console.error(`[validate-stage] ${filePath} top-level must be a mapping`);
  process.exit(1);
}

const missing = [];

for (const key of spec.requiredKeys) {
  const value = parsed[key];
  if (value === undefined || value === null) {
    missing.push(key);
    continue;
  }
  if (typeof value === 'string' && value.trim().length === 0) missing.push(key);
  if (Array.isArray(value) && value.length === 0) missing.push(`${key} (empty array)`);
}

for (const path of spec.requiredNested ?? []) {
  let cursor = parsed;
  let ok = true;
  for (const segment of path) {
    if (cursor == null || typeof cursor !== 'object' || !(segment in cursor)) { ok = false; break; }
    cursor = cursor[segment];
  }
  if (!ok || cursor == null) missing.push(path.join('.'));
}

for (const [path, minLength] of spec.requiredArrays ?? []) {
  let cursor = parsed;
  let ok = true;
  for (const segment of path) {
    if (cursor == null || typeof cursor !== 'object' || !(segment in cursor)) { ok = false; break; }
    cursor = cursor[segment];
  }
  if (!ok || cursor == null) continue; // already reported via requiredNested
  if (!Array.isArray(cursor)) {
    missing.push(`${path.join('.')} (must be a list)`);
  } else if (cursor.length < minLength) {
    missing.push(`${path.join('.')} (need at least ${minLength} entr${minLength === 1 ? 'y' : 'ies'})`);
  }
}

if (missing.length > 0) {
  console.error(`[validate-stage] ${filePath} missing required fields: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`[validate-stage] ${stage} ok: ${filePath}`);
