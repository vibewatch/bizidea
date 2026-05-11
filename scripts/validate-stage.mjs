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
    requiredKeys: ['triageSchemaVersion', 'runDate', 'timeWindow', 'clustersFound', 'selectedCount', 'clusters'],
    validate: validateTriage,
  },
  idea: {
    file: 'idea.yaml',
    requiredKeys: ['slug', 'date', 'pitch', 'sourceContext', 'startupThesis', 'goToMarketSeed', 'solution'],
    // `topRisks` must contain exactly 3 entries; the website's check-ideas.mjs
    // also enforces this for idea.yaml/idea.zh.yaml/index.yaml/index.zh.yaml.
    // Catching it here lets the writer agent self-correct before handoff.
    requiredArrays: [
      [['topRisks'], 3, 3],
    ],
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
    requiredArrays: [
      [['topRisks'], 3, 3],
    ],
  },
};

const TRIAGE_EVENT_TYPES = new Set(['funding', 'launch', 'mna', 'regulation', 'incident', 'news']);
const TRIAGE_SCORE_FIELDS = ['startupRelevance', 'painIntensity', 'opportunityClarity', 'nonObviousness'];

function roundHalfUp(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.floor(value * factor + 0.5) / factor;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isNumberInRange(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function nearlyEqual(a, b) {
  return Math.abs(a - b) < 0.05;
}

function hasAtMostOneDecimal(value) {
  return Number.isInteger(value * 10);
}

function dominantEventType(cluster) {
  const firstSourceType = Array.isArray(cluster.sourceBriefs) ? cluster.sourceBriefs.find((source) => isNonEmptyString(source?.eventType))?.eventType : null;
  if (firstSourceType) return firstSourceType;
  const firstKey = Array.isArray(cluster.eventKeys) ? cluster.eventKeys.find((key) => typeof key === 'string' && key.split('|').length === 3) : null;
  return firstKey ? firstKey.split('|')[1] : null;
}

function validateTriage(parsed) {
  const errors = [];

  if (parsed.triageSchemaVersion !== 2) {
    errors.push('triageSchemaVersion must be 2');
  }

  if (!Number.isInteger(parsed.clustersFound)) {
    errors.push('clustersFound must be an integer');
  }
  if (!Number.isInteger(parsed.selectedCount)) {
    errors.push('selectedCount must be an integer');
  }
  if (!Number.isInteger(parsed.cap) || parsed.cap < 0) {
    errors.push('cap must be a non-negative integer');
  }

  if (!Array.isArray(parsed.clusters)) {
    errors.push('clusters must be a list');
    return errors;
  }

  if (Number.isInteger(parsed.clustersFound) && parsed.clustersFound !== parsed.clusters.length) {
    errors.push(`clustersFound must equal clusters.length (${parsed.clusters.length})`);
  }

  const selectedClusters = parsed.clusters.filter((cluster) => cluster?.selected === true);
  if (Number.isInteger(parsed.selectedCount) && parsed.selectedCount !== selectedClusters.length) {
    errors.push(`selectedCount must equal selected clusters (${selectedClusters.length})`);
  }
  if (Number.isInteger(parsed.cap) && selectedClusters.length > parsed.cap) {
    errors.push(`selectedCount (${selectedClusters.length}) must not exceed cap (${parsed.cap})`);
  }

  let previousSortTuple = null;
  parsed.clusters.forEach((cluster, index) => {
    const label = `clusters[${index}]`;
    if (!isObject(cluster)) {
      errors.push(`${label} must be a mapping`);
      return;
    }

    for (const key of [
      'clusterId', 'proposedTopic', 'proposedSlug', 'sectorHint', 'headline',
      'primaryCompanies', 'topSourceUrls', 'eventKeys', 'itemCount',
      'startupRelevance', 'painIntensity', 'opportunityClarity', 'nonObviousness',
      'qualityScore', 'signalStrength', 'evidenceConfidence', 'incumbentGravity',
      'selectionScore', 'scoreRationale', 'selectionRationale', 'dedupeStatus',
      'dedupeRationale', 'selected',
    ]) {
      if (cluster[key] === undefined || cluster[key] === null) errors.push(`${label}.${key} is required`);
    }

    if (!Array.isArray(cluster.primaryCompanies) || cluster.primaryCompanies.length === 0) {
      errors.push(`${label}.primaryCompanies must be a non-empty list`);
    }
    if (!Array.isArray(cluster.topSourceUrls) || cluster.topSourceUrls.length === 0) {
      errors.push(`${label}.topSourceUrls must be a non-empty list`);
    }
    if (!Array.isArray(cluster.eventKeys) || cluster.eventKeys.length === 0) {
      errors.push(`${label}.eventKeys must be a non-empty list`);
    } else {
      for (const eventKey of cluster.eventKeys) {
        if (typeof eventKey !== 'string') {
          errors.push(`${label}.eventKeys entries must be strings`);
          continue;
        }
        const parts = eventKey.split('|');
        if (parts.length !== 3 || !TRIAGE_EVENT_TYPES.has(parts[1]) || !/^\d{4}-\d{2}$/.test(parts[2])) {
          errors.push(`${label}.eventKeys entry must match company|eventType|YYYY-MM: ${eventKey}`);
        }
      }
    }

    for (const field of TRIAGE_SCORE_FIELDS) {
      if (!isIntegerInRange(cluster[field], 1, 5)) errors.push(`${label}.${field} must be an integer from 1 to 5`);
    }
    for (const field of ['signalStrength', 'evidenceConfidence', 'incumbentGravity']) {
      if (!isIntegerInRange(cluster[field], 1, 5)) errors.push(`${label}.${field} must be an integer from 1 to 5`);
    }
    for (const field of ['qualityScore', 'selectionScore']) {
      if (!isNumberInRange(cluster[field], 0, 5)) errors.push(`${label}.${field} must be a number from 0 to 5`);
      else if (!hasAtMostOneDecimal(cluster[field])) errors.push(`${label}.${field} must use at most one decimal place`);
    }

    const hasValidCoreScores = TRIAGE_SCORE_FIELDS.every((field) => isIntegerInRange(cluster[field], 1, 5));
    if (hasValidCoreScores) {
      if (TRIAGE_SCORE_FIELDS.some((field) => cluster[field] === 1)) {
        errors.push(`${label} must not include a core opportunity sub-score of 1`);
      }

      const expectedQualityScore = roundHalfUp(
        0.15 * cluster.startupRelevance +
        0.30 * cluster.painIntensity +
        0.35 * cluster.opportunityClarity +
        0.20 * cluster.nonObviousness,
        1,
      );
      if (isNumberInRange(cluster.qualityScore, 0, 5) && !nearlyEqual(cluster.qualityScore, expectedQualityScore)) {
        errors.push(`${label}.qualityScore must equal weighted score ${expectedQualityScore}`);
      }
      if (isNumberInRange(cluster.qualityScore, 0, 5) && cluster.qualityScore < 2.0) {
        errors.push(`${label}.qualityScore must be at least 2.0 to appear in clusters`);
      }
      const expectedSignalStrength = roundHalfUp(expectedQualityScore);
      if (isIntegerInRange(cluster.signalStrength, 1, 5) && cluster.signalStrength !== expectedSignalStrength) {
        errors.push(`${label}.signalStrength must equal roundHalfUp(qualityScore) ${expectedSignalStrength}`);
      }
    }

    if (hasValidCoreScores && isIntegerInRange(cluster.evidenceConfidence, 1, 5) && isIntegerInRange(cluster.incumbentGravity, 1, 5) && isNumberInRange(cluster.qualityScore, 0, 5)) {
      const evidenceModifier = 0.75 + 0.05 * cluster.evidenceConfidence;
      const incumbentPenalty = cluster.incumbentGravity >= 4 && cluster.opportunityClarity < 4 ? 0.3 : 0;
      const expectedSelectionScore = roundHalfUp(Math.max(0, cluster.qualityScore * evidenceModifier - incumbentPenalty), 1);
      if (isNumberInRange(cluster.selectionScore, 0, 5) && !nearlyEqual(cluster.selectionScore, expectedSelectionScore)) {
        errors.push(`${label}.selectionScore must equal evidence-adjusted score ${expectedSelectionScore}`);
      }
    }

    if (cluster.selected !== true && cluster.selected !== false) {
      errors.push(`${label}.selected must be true or false`);
    }
    if (cluster.selected === true) {
      if (cluster.dedupeStatus !== 'new') errors.push(`${label}.selected requires dedupeStatus: new`);
      if (isNumberInRange(cluster.qualityScore, 0, 5) && cluster.qualityScore < 3.2) errors.push(`${label}.selected requires qualityScore >= 3.2`);
      if (isIntegerInRange(cluster.painIntensity, 1, 5) && cluster.painIntensity < 3) errors.push(`${label}.selected requires painIntensity >= 3`);
      if (isIntegerInRange(cluster.opportunityClarity, 1, 5) && cluster.opportunityClarity < 3) errors.push(`${label}.selected requires opportunityClarity >= 3`);
      if (isIntegerInRange(cluster.evidenceConfidence, 1, 5) && cluster.evidenceConfidence < 2) errors.push(`${label}.selected requires evidenceConfidence >= 2`);
      if (!Array.isArray(cluster.sourceBriefs) || cluster.sourceBriefs.length === 0) errors.push(`${label}.selected requires non-empty sourceBriefs`);
    }

    const eventType = dominantEventType(cluster);
    if (eventType && !TRIAGE_EVENT_TYPES.has(eventType)) errors.push(`${label} dominant eventType is invalid: ${eventType}`);

    if (isNumberInRange(cluster.selectionScore, 0, 5) && isNumberInRange(cluster.qualityScore, 0, 5) && isIntegerInRange(cluster.opportunityClarity, 1, 5) && isIntegerInRange(cluster.evidenceConfidence, 1, 5) && Number.isInteger(cluster.itemCount)) {
      const sortTuple = [cluster.selectionScore, cluster.qualityScore, cluster.opportunityClarity, cluster.evidenceConfidence, cluster.itemCount];
      if (previousSortTuple) {
        for (let i = 0; i < sortTuple.length; i += 1) {
          if (sortTuple[i] === previousSortTuple[i]) continue;
          if (sortTuple[i] > previousSortTuple[i]) errors.push(`${label} is out of sort order for selectionScore/qualityScore/opportunityClarity/evidenceConfidence/itemCount`);
          break;
        }
      }
      previousSortTuple = sortTuple;
    }
  });

  return errors;
}

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

for (const entry of spec.requiredArrays ?? []) {
  // Tuple shape: [path, minLength, maxLength?]. Omitting maxLength means "any
  // length ≥ minLength". Use minLength === maxLength for an exact-count check.
  const [path, minLength, maxLength] = entry;
  const pathLabel = path.join('.');
  const reportedAsNested = (spec.requiredNested ?? []).some((p) => p.length === path.length && p.every((seg, i) => seg === path[i]));
  let cursor = parsed;
  let ok = true;
  for (const segment of path) {
    if (cursor == null || typeof cursor !== 'object' || !(segment in cursor)) { ok = false; break; }
    cursor = cursor[segment];
  }
  if (!ok || cursor == null) {
    if (!reportedAsNested) missing.push(pathLabel);
    continue;
  }
  if (!Array.isArray(cursor)) {
    missing.push(`${pathLabel} (must be a list)`);
    continue;
  }
  if (cursor.length < minLength) {
    missing.push(`${pathLabel} (need at least ${minLength} entr${minLength === 1 ? 'y' : 'ies'}, got ${cursor.length})`);
    continue;
  }
  if (typeof maxLength === 'number' && cursor.length > maxLength) {
    missing.push(`${pathLabel} (must contain at most ${maxLength} entr${maxLength === 1 ? 'y' : 'ies'}, got ${cursor.length})`);
  }
}

if (missing.length > 0) {
  console.error(`[validate-stage] ${filePath} missing required fields: ${missing.join(', ')}`);
  process.exit(1);
}

const semanticErrors = spec.validate?.(parsed) ?? [];
if (semanticErrors.length > 0) {
  console.error(`[validate-stage] ${filePath} failed semantic checks: ${semanticErrors.join(', ')}`);
  process.exit(1);
}

console.log(`[validate-stage] ${stage} ok: ${filePath}`);
