#!/usr/bin/env node
// Resolve and create a stable report folder for one selected cluster.

import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function usage() {
  console.error('Usage: node scripts/create-report-dir.mjs <runTimestamp> <proposedSlug>');
  process.exit(2);
}

const runTimestamp = process.argv[2];
const rawSlug = process.argv[3];
if (!runTimestamp || !rawSlug) usage();

const slug = rawSlug
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-');

if (!/^\d{14}$/.test(runTimestamp)) {
  console.error(`[create-report-dir] invalid run timestamp: ${runTimestamp}`);
  process.exit(1);
}
if (!slug) {
  console.error(`[create-report-dir] invalid slug: ${rawSlug}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const ideasDir = join(repoRoot, 'ideas');

let folder = join(ideasDir, `${runTimestamp}-${slug}`);
let n = 2;
while (existsSync(folder)) {
  folder = join(ideasDir, `${runTimestamp}-${slug}-${n}`);
  n += 1;
}

mkdirSync(folder, { recursive: true });
process.stdout.write(folder);