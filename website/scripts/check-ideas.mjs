#!/usr/bin/env node
// Fail fast if any ideas/<run>/ folder is missing one of the six required YAML files.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDEAS_DIR = resolve(__dirname, '../../ideas');
const REQUIRED = [
  'news.yaml',
  'idea.yaml',
  'research.yaml',
  'business-plan.yaml',
  'financial-model.yaml',
  'index.yaml',
];

if (!existsSync(IDEAS_DIR)) {
  console.warn(`[check:ideas] ${IDEAS_DIR} not found; nothing to check.`);
  process.exit(0);
}

const runs = readdirSync(IDEAS_DIR).filter((name) => {
  const p = join(IDEAS_DIR, name);
  return statSync(p).isDirectory() && !name.startsWith('.') && !name.startsWith('_');
});

const failures = [];
for (const run of runs) {
  for (const file of REQUIRED) {
    const p = join(IDEAS_DIR, run, file);
    if (!existsSync(p)) failures.push(`${run}/${file}`);
  }
}

if (failures.length) {
  console.error('[check:ideas] missing required artifact files:');
  for (const f of failures) console.error(`  - ideas/${f}`);
  process.exit(1);
}

console.log(`[check:ideas] ok — ${runs.length} run(s) verified.`);
