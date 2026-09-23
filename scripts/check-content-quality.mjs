#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

const ROOT = resolve(import.meta.dirname, '..');
const IDEAS_ROOT = join(ROOT, 'ideas');

function listReportFolders() {
  if (!existsSync(IDEAS_ROOT)) return [];
  return readdirSync(IDEAS_ROOT)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .map((name) => join(IDEAS_ROOT, name))
    .filter((path) => statSync(path).isDirectory());
}

function load(path) {
  return yaml.load(readFileSync(path, 'utf8'));
}

const failures = [];
let checked = 0;

for (const folder of listReportFolders()) {
  const ideaPath = join(folder, 'idea.yaml');
  if (!existsSync(ideaPath)) continue;

  let idea;
  try {
    idea = load(ideaPath);
  } catch (err) {
    failures.push(`${folder}: failed to parse idea.yaml: ${err.message}`);
    continue;
  }
  if (Number(idea?.qualityPolicyVersion || 1) < 2) continue;

  checked += 1;
  for (const stage of ['idea', 'research']) {
    const result = spawnSync(process.execPath, ['scripts/validate-stage.mjs', folder, stage], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      failures.push(`${folder}: ${stage} validation failed${output ? `\n${output}` : ''}`);
    }
  }

  const indexPath = join(folder, 'index.yaml');
  if (!existsSync(indexPath)) {
    failures.push(`${folder}: missing index.yaml`);
    continue;
  }
  try {
    const index = load(indexPath);
    const sourceLens = idea.selectionLens;
    const indexLens = index?.selectionLens;
    if (
      indexLens?.championDimension !== sourceLens?.championDimension
      || indexLens?.championScore !== sourceLens?.championScore
      || indexLens?.whyThisWins !== sourceLens?.whyThisWins
    ) {
      failures.push(`${folder}: index.selectionLens must mirror idea.selectionLens`);
    }
  } catch (err) {
    failures.push(`${folder}: failed to parse index.yaml: ${err.message}`);
  }
}

if (failures.length > 0) {
  console.error(`[check-content-quality] ✗ ${failures.length} issue(s) across ${checked} current-policy report(s):`);
  for (const failure of failures) {
    console.error(failure.split('\n').map((line) => `  ${line}`).join('\n'));
  }
  process.exit(1);
}

console.log(`[check-content-quality] ✓ ${checked} current-policy report(s) passed champion, originality, research, and index checks.`);
