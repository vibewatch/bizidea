#!/usr/bin/env node
// Deterministic post-idea dedup gate. It compares a freshly generated
// idea.yaml against ideas/_index.yaml and optionally removes partial folders.

import { existsSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import yaml from 'js-yaml';
import { tokens, intersectionSize, jaccard } from './text.mjs';

// Dedupe heuristics are intentionally conservative:
// - exact slug catches deterministic reruns of the same concept.
// - same sector + 6+ beachhead tokens catches near-identical ICP/wedge theses.
// - 0.55 pitch Jaccard catches strongly overlapping elevator pitches while
//   avoiding broad sector-level false positives.
const BEACHHEAD_OVERLAP_THRESHOLD = 6;
const PITCH_JACCARD_THRESHOLD = 0.55;

function usage() {
  console.error('Usage: node scripts/dedupe-idea.mjs <reportFolder> <ideas/_index.yaml> [--delete-on-duplicate] [--github-output <path>]');
  process.exit(2);
}

function loadYaml(path) {
  if (!existsSync(path)) return null;
  return yaml.load(readFileSync(path, 'utf8'));
}

function writeOutput(path, key, value) {
  if (!path) return;
  appendFileSync(path, `${key}=${String(value).replace(/\n/g, ' ')}\n`, 'utf8');
}

const args = process.argv.slice(2);
const reportFolder = args[0] ? resolve(args[0]) : null;
const indexPath = args[1] ? resolve(args[1]) : null;
const deleteOnDuplicate = args.includes('--delete-on-duplicate');
const outputFlag = args.indexOf('--github-output');
const githubOutput = outputFlag >= 0 ? args[outputFlag + 1] : null;
if (!reportFolder || !indexPath) usage();

const ideaPath = join(reportFolder, 'idea.yaml');
if (!existsSync(ideaPath)) {
  console.error(`[dedupe-idea] missing ${ideaPath}`);
  process.exit(1);
}

let idea;
try {
  idea = loadYaml(ideaPath);
} catch (err) {
  console.error(`[dedupe-idea] failed to parse idea.yaml: ${err.message}`);
  process.exit(1);
}

const history = loadYaml(indexPath) || { entries: [] };
const entries = Array.isArray(history.entries) ? history.entries : [];
const ideaSlug = String(idea?.slug || '');
const ideaSector = String(idea?.sector || '');
const ideaBeachheadTokens = tokens(idea?.startupThesis?.beachhead);
const ideaPitchTokens = tokens(idea?.pitch);

let match = null;
for (const entry of entries) {
  const runFolder = String(entry.runFolder || 'unknown');
  if (ideaSlug && ideaSlug === String(entry.slug || '')) {
    match = { runFolder, reason: 'exact-slug' };
    break;
  }
  if (ideaSector && ideaSector === String(entry.sector || '')) {
    const overlap = intersectionSize(ideaBeachheadTokens, tokens(entry.beachhead));
    if (overlap >= BEACHHEAD_OVERLAP_THRESHOLD) {
      match = { runFolder, reason: `sector-beachhead-overlap-${overlap}` };
      break;
    }
  }
  const similarity = jaccard(ideaPitchTokens, tokens(entry.pitch));
  if (similarity >= PITCH_JACCARD_THRESHOLD) {
    match = { runFolder, reason: `pitch-jaccard-${similarity.toFixed(2)}` };
    break;
  }
}

if (match) {
  if (deleteOnDuplicate) rmSync(reportFolder, { recursive: true, force: true });
  writeOutput(githubOutput, 'duplicate', 'true');
  writeOutput(githubOutput, 'matchedRunFolder', match.runFolder);
  writeOutput(githubOutput, 'dedupeReason', match.reason);
  console.log(`[dedupe-idea] duplicate ${basename(reportFolder)} -> ${match.runFolder} (${match.reason})`);
  process.exit(0);
}

writeOutput(githubOutput, 'duplicate', 'false');
writeOutput(githubOutput, 'matchedRunFolder', '');
writeOutput(githubOutput, 'dedupeReason', 'new');
console.log(`[dedupe-idea] new idea: ${basename(reportFolder)}`);