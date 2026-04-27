#!/usr/bin/env node
// Validate one completed ideas/<run>/ folder before it is uploaded from a
// matrix job or accepted by the website build.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import yaml from 'js-yaml';

function usage() {
  console.error('Usage: node scripts/validate-idea-folder.mjs <ideas/run-folder>');
  process.exit(2);
}

const folder = process.argv[2] ? resolve(process.argv[2]) : null;
if (!folder) usage();

const required = [
  'idea.yaml',
  'research.yaml',
  'business-plan.yaml',
  'financial-model.yaml',
  'index.yaml',
];

const minimumFields = {
  'idea.yaml': ['slug', 'date', 'pitch', 'startupThesis', 'goToMarketSeed', 'solution'],
  'research.yaml': ['slug', 'date', 'researchCoverage', 'deduplication', 'market', 'competitors'],
  'business-plan.yaml': ['slug', 'date', 'executiveSummary', 'strategicChoices', 'market', 'gtm', 'fundingAsk'],
  'financial-model.yaml': ['slug', 'date', 'totals', 'unitEconomics', 'fundingAsk', 'modelSanity'],
  'index.yaml': ['slug', 'date', 'pitch', 'rating', 'files', 'financials'],
};

function hasTopLevel(data, field) {
  return data && Object.prototype.hasOwnProperty.call(data, field) && data[field] !== undefined;
}

const failures = [];
for (const file of required) {
  const path = join(folder, file);
  if (!existsSync(path)) {
    failures.push(`${file}: missing`);
    continue;
  }
  if (!statSync(path).isFile() || statSync(path).size === 0) {
    failures.push(`${file}: empty or not a file`);
    continue;
  }
  let data;
  try {
    data = yaml.load(readFileSync(path, 'utf8'));
  } catch (err) {
    failures.push(`${file}: invalid YAML (${err.message})`);
    continue;
  }
  for (const field of minimumFields[file]) {
    if (!hasTopLevel(data, field)) failures.push(`${file}: missing top-level field ${field}`);
  }
}

if (failures.length) {
  console.error(`[validate-idea-folder] ${folder} failed validation:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`[validate-idea-folder] ok — ${folder}`);