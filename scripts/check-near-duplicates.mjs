#!/usr/bin/env node
// Review likely duplicate report topics using the aggregate ideas/_index.yaml.
//
// Default mode prints review candidates but exits 0 so daily runs are not
// blocked by adjacent-but-legitimate follow-up stories. Pass --strict to fail
// when any candidate is found.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { tokens, intersectionSize, jaccard } from './text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const INDEX_PATH = join(REPO_ROOT, 'ideas', '_index.yaml');
const ARGS = new Set(process.argv.slice(2));
const STRICT = ARGS.has('--strict');

function loadIndex() {
  if (!existsSync(INDEX_PATH)) {
    console.warn(`[near-duplicates] ${INDEX_PATH} not found; nothing to check.`);
    return { entries: [] };
  }
  return yaml.load(readFileSync(INDEX_PATH, 'utf8')) || { entries: [] };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedSet(values) {
  return new Set(asArray(values).map((v) => String(v).trim().toLowerCase()).filter(Boolean));
}

function overlap(aValues, bValues) {
  const a = normalizedSet(aValues);
  const b = normalizedSet(bValues);
  return [...a].filter((value) => b.has(value));
}

function daysBetween(aDate, bDate) {
  const a = Date.parse(`${aDate || ''}T00:00:00Z`);
  const b = Date.parse(`${bDate || ''}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(a - b) / 86_400_000;
}

function candidateReasons(a, b) {
  const reasons = [];
  const sharedEventKeys = overlap(a.eventKeys, b.eventKeys);
  const sharedCompanies = overlap(a.topCompanies, b.topCompanies);
  const sameSector = String(a.sector || '') === String(b.sector || '');
  const pitchSimilarity = jaccard(tokens(a.pitch), tokens(b.pitch));
  const slugSimilarity = jaccard(tokens(String(a.slug || '').replace(/-/g, ' ')), tokens(String(b.slug || '').replace(/-/g, ' ')));
  const keywordOverlap = intersectionSize(tokens(asArray(a.keywords).join(' ')), tokens(asArray(b.keywords).join(' ')));
  const dayGap = daysBetween(a.date, b.date);

  if (sharedEventKeys.length > 0) reasons.push(`shared event key ${sharedEventKeys.slice(0, 2).join(', ')}`);
  if (pitchSimilarity >= 0.55) reasons.push(`pitch similarity ${pitchSimilarity.toFixed(2)}`);
  if (slugSimilarity >= 0.5) reasons.push(`slug similarity ${slugSimilarity.toFixed(2)}`);
  if (keywordOverlap >= 8) reasons.push(`keyword overlap ${keywordOverlap}`);
  if (sameSector && sharedCompanies.length > 0 && (dayGap == null || dayGap <= 45) && (pitchSimilarity >= 0.25 || slugSimilarity >= 0.25)) {
    reasons.push(`same company/sector within ${dayGap == null ? 'unknown' : Math.round(dayGap)}d: ${sharedCompanies.slice(0, 2).join(', ')}`);
  }

  return {
    reasons,
    score: sharedEventKeys.length * 100 + sharedCompanies.length * 20 + pitchSimilarity * 10 + slugSimilarity * 10 + keywordOverlap,
  };
}

function main() {
  const index = loadIndex();
  const entries = asArray(index.entries);
  const candidates = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      const { reasons, score } = candidateReasons(a, b);
      if (reasons.length === 0) continue;
      candidates.push({ a, b, reasons, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score || String(b.b.date || '').localeCompare(String(a.b.date || '')));

  if (candidates.length === 0) {
    console.log(`[near-duplicates] ✓ no review candidates across ${entries.length} entries.`);
    return;
  }

  console.log(`[near-duplicates] ${candidates.length} review candidate(s) across ${entries.length} entries:`);
  for (const candidate of candidates.slice(0, 20)) {
    console.log(`  - ${candidate.a.runFolder} ↔ ${candidate.b.runFolder}`);
    console.log(`    reasons: ${candidate.reasons.join('; ')}`);
    console.log(`    pitches: ${candidate.a.pitch} / ${candidate.b.pitch}`);
  }
  if (candidates.length > 20) console.log(`  - ...and ${candidates.length - 20} more`);

  if (STRICT) process.exit(1);
}

main();
