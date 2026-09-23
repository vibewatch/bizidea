#!/usr/bin/env node
// Validate every historical triage artifact under ideas/_triage against the
// current validate-stage triage gate.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const TRIAGE_ROOT = join(REPO_ROOT, 'ideas', '_triage');

function findTriageFiles(root = TRIAGE_ROOT) {
  if (!existsSync(root)) return [];
  const files = [];

  function visit(folder) {
    for (const entry of readdirSync(folder)) {
      const path = join(folder, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        visit(path);
      } else if (entry === 'triage.yaml') {
        files.push(path);
      }
    }
  }

  visit(root);
  return files.sort();
}

const files = findTriageFiles();
const failures = [];
let legacySkipped = 0;
let currentChecked = 0;

for (const file of files) {
  let parsed;
  try {
    parsed = yaml.load(readFileSync(file, 'utf8'));
  } catch (err) {
    failures.push({ file, result: { stdout: '', stderr: `YAML parse error: ${err.message}` } });
    continue;
  }

  if (![3, 4].includes(parsed?.triageSchemaVersion)) {
    legacySkipped += 1;
    continue;
  }

  currentChecked += 1;
  const folder = dirname(file);
  const result = spawnSync(process.execPath, ['scripts/validate-stage.mjs', folder, 'triage'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failures.push({ file, result });
  }
}

if (failures.length > 0) {
  console.error(`[check-triage] ${failures.length}/${files.length} triage file(s) failed validation:`);
  for (const failure of failures) {
    console.error(`  - ${relative(REPO_ROOT, failure.file)}`);
    const output = [failure.result.stdout, failure.result.stderr].filter(Boolean).join('\n').trim();
    if (output) console.error(output.split('\n').map((line) => `    ${line}`).join('\n'));
  }
  process.exit(1);
}

console.log(`[check-triage] ✓ ${currentChecked} current triage run(s) verified; ${legacySkipped} legacy run(s) skipped.`);
