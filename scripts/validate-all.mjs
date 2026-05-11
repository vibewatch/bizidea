#!/usr/bin/env node
// Run every validation check and report all failing stages instead of stopping
// at the first failure. This is useful for CI logs and agent-driven repair
// loops where seeing the full error surface saves follow-up runs.

import { spawnSync } from 'node:child_process';

const checks = [
  { label: 'agent frontmatter', command: 'npm', args: ['run', 'check:agents'] },
  { label: 'historical triage validation', command: 'npm', args: ['run', 'check:triage'] },
  { label: 'ideas index freshness', command: 'npm', args: ['run', 'check:ideas-index'] },
  { label: 'near duplicate review', command: 'npm', args: ['run', 'check:duplicates'] },
  { label: 'idea artifact validation', command: 'npm', args: ['run', 'check:ideas'] },
  { label: 'Chinese translation validation', command: 'npm', args: ['run', 'check:zh-translations'] },
  { label: 'website typecheck', command: 'npm', args: ['run', 'check:types'] },
  { label: 'unit/regression tests', command: 'npm', args: ['run', 'test'] },
  { label: 'website static build', command: 'npm', args: ['--prefix', 'website', 'run', 'build'] },
];

const failures = [];

for (const check of checks) {
  const started = Date.now();
  console.log(`\n[validate:all] ▶ ${check.label}`);
  console.log(`[validate:all] $ ${[check.command, ...check.args].join(' ')}`);

  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.error) {
    failures.push({ label: check.label, detail: result.error.message });
    console.error(`[validate:all] ✗ ${check.label} failed to run after ${seconds}s: ${result.error.message}`);
    continue;
  }

  if (result.signal) {
    failures.push({ label: check.label, detail: `terminated by ${result.signal}` });
    console.error(`[validate:all] ✗ ${check.label} terminated by ${result.signal} after ${seconds}s`);
    continue;
  }

  if (result.status !== 0) {
    failures.push({ label: check.label, detail: `exit ${result.status}` });
    console.error(`[validate:all] ✗ ${check.label} failed after ${seconds}s with exit ${result.status}`);
    continue;
  }

  console.log(`[validate:all] ✓ ${check.label} passed in ${seconds}s`);
}

if (failures.length > 0) {
  console.error(`\n[validate:all] ✗ ${failures.length}/${checks.length} check(s) failed:`);
  for (const failure of failures) {
    console.error(`  - ${failure.label}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(`\n[validate:all] ✓ all ${checks.length} check(s) passed.`);