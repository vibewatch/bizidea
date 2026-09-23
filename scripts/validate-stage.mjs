#!/usr/bin/env node
// Per-stage minimum-fields and quality gate. Each Bizidea specialist runs this
// after writing its artifact; the orchestrator re-runs it before advancing.
//
// This is intentionally a structural check, not the full Zod schema: it
// matches the artifact-gates table in `.github/agents/bizidea.agent.md` so
// agents can self-correct before the website's Zod validation runs in CI.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import yaml from 'js-yaml';
import { findTitleCliche } from './text.mjs';

const STAGES = {
  triage: {
    file: 'triage.yaml',
    requiredKeys: [
      'triageSchemaVersion', 'runDate', 'timeWindow', 'clustersFound',
      'selectedCount', 'searchStrategy', 'clusters',
    ],
    validate: validateTriage,
  },
  idea: {
    file: 'idea.yaml',
    requiredKeys: [
      'qualityPolicyVersion', 'slug', 'date', 'pitch', 'sourceContext',
      'selectionLens', 'originalityAudit', 'startupThesis', 'goToMarketSeed',
      'ideaScorecard', 'solution',
    ],
    requiredArrays: [
      [['topRisks'], 3, 3],
    ],
    validate: validateIdea,
  },
  research: {
    file: 'research.yaml',
    requiredKeys: [
      'researchPolicyVersion', 'slug', 'date', 'market', 'competitors',
      'researchCoverage', 'deduplication', 'evidenceCorpus', 'sources',
    ],
    requiredNested: [['reportMemo', 'incumbentThesis']],
    requiredArrays: [
      [['reportMemo', 'incumbentThesis'], 1],
    ],
    validate: validateResearch,
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
const TRIAGE_CHAMPION_FIELDS = ['creativePotential', 'venturePotential', 'whiteSpacePotential'];
const TRIAGE_CHAMPION_DIMENSIONS = new Set(TRIAGE_CHAMPION_FIELDS);
const TRIAGE_SOURCE_TYPES = new Set([
  'primary-company', 'regulatory-government', 'tier-one-news', 'trade-press',
  'analyst-market-data', 'customer-community', 'technical-docs', 'other',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function dominantEventType(cluster) {
  const firstSourceType = Array.isArray(cluster.sourceBriefs) ? cluster.sourceBriefs.find((source) => isNonEmptyString(source?.eventType))?.eventType : null;
  if (firstSourceType) return firstSourceType;
  const firstKey = Array.isArray(cluster.eventKeys) ? cluster.eventKeys.find((key) => typeof key === 'string' && key.split('|').length === 3) : null;
  return firstKey ? firstKey.split('|')[1] : null;
}

function validateTriage(parsed) {
  const errors = [];

  if (![3, 4].includes(parsed.triageSchemaVersion)) {
    errors.push('triageSchemaVersion must be 3 or 4');
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

  if (!isObject(parsed.searchStrategy)) {
    errors.push('searchStrategy must be a mapping');
  } else {
    if (!isNonEmptyString(parsed.searchStrategy.provider)) {
      errors.push('searchStrategy.provider must be a non-empty string');
    }
    for (const field of ['queriesRun', 'candidatesFound', 'candidatesFetched', 'uniquePublishers']) {
      if (!Number.isInteger(parsed.searchStrategy[field]) || parsed.searchStrategy[field] < 0) {
        errors.push(`searchStrategy.${field} must be a non-negative integer`);
      }
    }
    for (const field of ['sourceTypesCovered', 'regionsCovered']) {
      if (!Array.isArray(parsed.searchStrategy[field]) || parsed.searchStrategy[field].length === 0) {
        errors.push(`searchStrategy.${field} must be a non-empty list`);
      }
    }
    if (typeof parsed.searchStrategy.saturationReached !== 'boolean') {
      errors.push('searchStrategy.saturationReached must be true or false');
    }
    if (parsed.triageSchemaVersion === 4) {
      if (parsed.searchStrategy.queriesRun > 16) {
        errors.push('triage v4 searchStrategy.queriesRun must not exceed 16');
      }
      if (parsed.searchStrategy.candidatesFetched > 32) {
        errors.push('triage v4 searchStrategy.candidatesFetched must not exceed 32');
      }
    }
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

  parsed.clusters.forEach((cluster, index) => {
    const label = `clusters[${index}]`;
    if (!isObject(cluster)) {
      errors.push(`${label} must be a mapping`);
      return;
    }

    for (const key of [
      'clusterId', 'proposedTopic', 'proposedSlug', 'sectorHint', 'headline',
      'primaryCompanies', 'topSourceUrls', 'eventKeys', 'itemCount',
      'painIntensity', 'opportunityClarity', 'creativePotential',
      'venturePotential', 'whiteSpacePotential', 'evidenceConfidence',
      'incumbentGravity', 'championDimension', 'championScore',
      'frontierStatus', 'sourceDiversity', 'scoreRationale',
      'selectionRationale', 'dedupeStatus', 'dedupeRationale', 'selected',
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

    for (const field of ['painIntensity', 'opportunityClarity', ...TRIAGE_CHAMPION_FIELDS]) {
      if (!isIntegerInRange(cluster[field], 1, 5)) errors.push(`${label}.${field} must be an integer from 1 to 5`);
    }
    for (const field of ['evidenceConfidence', 'incumbentGravity']) {
      if (!isIntegerInRange(cluster[field], 1, 5)) errors.push(`${label}.${field} must be an integer from 1 to 5`);
    }

    if (!TRIAGE_CHAMPION_DIMENSIONS.has(cluster.championDimension)) {
      errors.push(`${label}.championDimension must be creativePotential, venturePotential, or whiteSpacePotential`);
    }
    if (!isIntegerInRange(cluster.championScore, 1, 5)) {
      errors.push(`${label}.championScore must be an integer from 1 to 5`);
    } else if (TRIAGE_CHAMPION_DIMENSIONS.has(cluster.championDimension) && cluster.championScore !== cluster[cluster.championDimension]) {
      errors.push(`${label}.championScore must equal ${cluster.championDimension}`);
    }

    if (!['non-dominated', 'dominated'].includes(cluster.frontierStatus)) {
      errors.push(`${label}.frontierStatus must be non-dominated or dominated`);
    }

    const briefs = Array.isArray(cluster.sourceBriefs) ? cluster.sourceBriefs : [];
    for (const [briefIndex, brief] of briefs.entries()) {
      const briefLabel = `${label}.sourceBriefs[${briefIndex}]`;
      if (!isObject(brief)) {
        errors.push(`${briefLabel} must be a mapping`);
        continue;
      }
      if (!TRIAGE_SOURCE_TYPES.has(brief.sourceType)) {
        errors.push(`${briefLabel}.sourceType is invalid`);
      }
      if (!isNonEmptyString(brief.geography)) {
        errors.push(`${briefLabel}.geography must be a non-empty string`);
      }
      if (typeof brief.isPrimary !== 'boolean') {
        errors.push(`${briefLabel}.isPrimary must be true or false`);
      }
    }

    if (!isObject(cluster.sourceDiversity)) {
      errors.push(`${label}.sourceDiversity must be a mapping`);
    } else {
      const computed = computeSourceDiversity(briefs);
      for (const field of [
        'uniquePublishers', 'sourceTypeCount', 'primarySourceCount',
        'independentSourceCount', 'geographyCount', 'maxPublisherSharePct',
      ]) {
        if (cluster.sourceDiversity[field] !== computed[field]) {
          errors.push(`${label}.sourceDiversity.${field} must equal ${computed[field]}`);
        }
      }
      if (cluster.sourceDiversity.diversityGap !== null && !isNonEmptyString(cluster.sourceDiversity.diversityGap)) {
        errors.push(`${label}.sourceDiversity.diversityGap must be a non-empty string or null`);
      }
    }

    if (cluster.selected !== true && cluster.selected !== false) {
      errors.push(`${label}.selected must be true or false`);
    }
    if (cluster.selected === true) {
      if (cluster.dedupeStatus !== 'new') errors.push(`${label}.selected requires dedupeStatus: new`);
      if (isIntegerInRange(cluster.painIntensity, 1, 5) && cluster.painIntensity < 3) errors.push(`${label}.selected requires painIntensity >= 3`);
      if (isIntegerInRange(cluster.opportunityClarity, 1, 5) && cluster.opportunityClarity < 3) errors.push(`${label}.selected requires opportunityClarity >= 3`);
      if (isIntegerInRange(cluster.evidenceConfidence, 1, 5) && cluster.evidenceConfidence < 3) errors.push(`${label}.selected requires evidenceConfidence >= 3`);
      if (cluster.championScore !== 5) errors.push(`${label}.selected requires championScore: 5`);
      if (cluster.frontierStatus !== 'non-dominated') errors.push(`${label}.selected requires frontierStatus: non-dominated`);
      if (briefs.length < 4) errors.push(`${label}.selected requires at least 4 sourceBriefs`);
      if (isObject(cluster.sourceDiversity)) {
        if (cluster.sourceDiversity.uniquePublishers < 3) errors.push(`${label}.selected requires at least 3 unique publishers`);
        if (cluster.sourceDiversity.sourceTypeCount < 3) errors.push(`${label}.selected requires at least 3 source types`);
        if (cluster.sourceDiversity.primarySourceCount < 1) errors.push(`${label}.selected requires at least 1 primary source`);
        if (cluster.sourceDiversity.independentSourceCount < 1) errors.push(`${label}.selected requires at least 1 independent source`);
        if (cluster.sourceDiversity.maxPublisherSharePct > 50) errors.push(`${label}.selected requires maxPublisherSharePct <= 50`);
        if (cluster.sourceDiversity.diversityGap !== null) errors.push(`${label}.selected requires diversityGap: null`);
      }
    }

    const eventType = dominantEventType(cluster);
    if (eventType && !TRIAGE_EVENT_TYPES.has(eventType)) errors.push(`${label} dominant eventType is invalid: ${eventType}`);
  });

  const eligibleClusters = parsed.clusters.filter(isTriageEligible);
  for (const cluster of eligibleClusters) {
    const dominated = eligibleClusters.some((other) => other !== cluster && dominatesTriageCluster(other, cluster));
    const expected = dominated ? 'dominated' : 'non-dominated';
    if (cluster.frontierStatus !== expected) {
      errors.push(`${cluster.clusterId}.frontierStatus must be ${expected}`);
    }
  }

  for (const cluster of selectedClusters) {
    if (!TRIAGE_CHAMPION_DIMENSIONS.has(cluster.championDimension)) continue;
    const cohortMax = Math.max(...eligibleClusters.map((candidate) => candidate[cluster.championDimension] ?? 0));
    if (Number.isFinite(cohortMax) && cluster.championScore !== cohortMax) {
      errors.push(`${cluster.clusterId} must tie the cohort maximum ${cohortMax} for ${cluster.championDimension}`);
    }
  }

  if (parsed.topicScope === 'broad') {
    const dimensionCounts = new Map();
    for (const cluster of selectedClusters) {
      dimensionCounts.set(cluster.championDimension, (dimensionCounts.get(cluster.championDimension) || 0) + 1);
    }
    for (const [dimension, count] of dimensionCounts) {
      if (count > 2) errors.push(`broad selection may include at most 2 champions for ${dimension}`);
    }
  }

  return errors;
}

function computeSourceDiversity(briefs) {
  const publisherCounts = new Map();
  const sourceTypes = new Set();
  const geographies = new Set();
  let primarySourceCount = 0;
  for (const brief of briefs) {
    if (!isObject(brief)) continue;
    if (isNonEmptyString(brief.publisher)) {
      publisherCounts.set(brief.publisher, (publisherCounts.get(brief.publisher) || 0) + 1);
    }
    if (isNonEmptyString(brief.sourceType)) sourceTypes.add(brief.sourceType);
    if (isNonEmptyString(brief.geography)) geographies.add(brief.geography);
    if (brief.isPrimary === true) primarySourceCount += 1;
  }
  const maxPublisherCount = Math.max(0, ...publisherCounts.values());
  return {
    uniquePublishers: publisherCounts.size,
    sourceTypeCount: sourceTypes.size,
    primarySourceCount,
    independentSourceCount: Math.max(0, briefs.length - primarySourceCount),
    geographyCount: geographies.size,
    maxPublisherSharePct: briefs.length > 0 ? Math.round((maxPublisherCount / briefs.length) * 100) : 0,
  };
}

function isTriageEligible(cluster) {
  const diversity = cluster?.sourceDiversity;
  return cluster?.dedupeStatus === 'new'
    && isIntegerInRange(cluster?.painIntensity, 3, 5)
    && isIntegerInRange(cluster?.opportunityClarity, 3, 5)
    && isIntegerInRange(cluster?.evidenceConfidence, 3, 5)
    && TRIAGE_CHAMPION_FIELDS.some((field) => cluster?.[field] === 5)
    && isObject(diversity)
    && diversity.uniquePublishers >= 3
    && diversity.sourceTypeCount >= 3
    && diversity.primarySourceCount >= 1
    && diversity.independentSourceCount >= 1
    && diversity.maxPublisherSharePct <= 50
    && diversity.diversityGap === null;
}

function dominatesTriageCluster(a, b) {
  const fields = [...TRIAGE_CHAMPION_FIELDS, 'evidenceConfidence'];
  return fields.every((field) => a[field] >= b[field])
    && fields.some((field) => a[field] > b[field]);
}

function validateIdea(parsed) {
  const errors = [];
  if (parsed.qualityPolicyVersion !== 2) {
    errors.push('qualityPolicyVersion must be 2');
  }

  const cliche = findTitleCliche(parsed.slug, parsed.pitch);
  if (cliche || /(?:^|-)os(?:-|$)/i.test(String(parsed.slug || ''))) {
    errors.push('slug and pitch must not use OS/copilot/control-plane style naming clichés');
  }

  const lens = parsed.selectionLens;
  const scorecard = parsed.ideaScorecard;
  const dimensions = new Set(['creativeNovelty', 'venturePotential', 'whiteSpace']);
  if (!isObject(lens)) {
    errors.push('selectionLens must be a mapping');
  } else {
    if (!dimensions.has(lens.championDimension)) {
      errors.push('selectionLens.championDimension is invalid');
    }
    if (lens.championScore !== 5) {
      errors.push('selectionLens.championScore must be 5');
    }
    if (!isNonEmptyString(lens.whyThisWins)) {
      errors.push('selectionLens.whyThisWins must be a non-empty string');
    }
    if (!isNonEmptyString(lens.acceptedTradeoff)) {
      errors.push('selectionLens.acceptedTradeoff must be a non-empty string');
    }
  }

  if (!isObject(scorecard)) {
    errors.push('ideaScorecard must be a mapping');
  } else {
    for (const dimension of dimensions) {
      if (!isIntegerInRange(scorecard?.[dimension]?.score, 1, 5)) {
        errors.push(`ideaScorecard.${dimension}.score must be an integer from 1 to 5`);
      }
    }
    if (isObject(lens) && dimensions.has(lens.championDimension)) {
      if (scorecard?.[lens.championDimension]?.score !== 5) {
        errors.push(`ideaScorecard.${lens.championDimension}.score must be 5`);
      }
    }
  }

  const audit = parsed.originalityAudit;
  if (!isObject(audit)) {
    errors.push('originalityAudit must be a mapping');
  } else {
    if (!Array.isArray(audit.archetypesConsidered) || new Set(audit.archetypesConsidered).size < 4) {
      errors.push('originalityAudit.archetypesConsidered must contain at least 4 distinct archetypes');
    }
    if (!Array.isArray(audit.rejectedCliches) || audit.rejectedCliches.length < 3) {
      errors.push('originalityAudit.rejectedCliches must contain at least 3 entries');
    }
    if (!isNonEmptyString(audit.rareMechanism)) {
      errors.push('originalityAudit.rareMechanism must be a non-empty string');
    }
    if (!Array.isArray(audit.nearestHistoricalIdeas)) {
      errors.push('originalityAudit.nearestHistoricalIdeas must be a list');
    }
  }

  return errors;
}

function validateResearch(parsed) {
  const errors = [];
  if (![2, 3].includes(parsed.researchPolicyVersion)) {
    errors.push('researchPolicyVersion must be 2 or 3');
  }

  const coverage = parsed.researchCoverage;
  const corpus = Array.isArray(parsed.evidenceCorpus) ? parsed.evidenceCorpus : [];
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  if (!isObject(coverage)) {
    errors.push('researchCoverage must be a mapping');
    return errors;
  }

  for (const field of [
    'sourceBudgetMin', 'sourceBudgetMax', 'sourcesFound', 'sourcesFetched',
    'sourcesRetained', 'duplicatesRemoved', 'memoSourcesUsed',
    'uniquePublishers', 'sourceTypeCount', 'primarySourceCount',
    'independentSourceCount',
  ]) {
    if (!Number.isInteger(coverage[field]) || coverage[field] < 0) {
      errors.push(`researchCoverage.${field} must be a non-negative integer`);
    }
  }
  if (parsed.researchPolicyVersion === 3) {
    if (coverage.sourceBudgetMin < 24 || coverage.sourceBudgetMin > 30) {
      errors.push('research v3 sourceBudgetMin must be between 24 and 30');
    }
    if (coverage.sourceBudgetMax < coverage.sourceBudgetMin || coverage.sourceBudgetMax > 36) {
      errors.push('research v3 sourceBudgetMax must be between sourceBudgetMin and 36');
    }
  } else {
    if (coverage.sourceBudgetMin < 24 || coverage.sourceBudgetMin > 40) {
      errors.push('researchCoverage.sourceBudgetMin must be between 24 and 40');
    }
    if (coverage.sourceBudgetMax < coverage.sourceBudgetMin || coverage.sourceBudgetMax > 60) {
      errors.push('researchCoverage.sourceBudgetMax must be between sourceBudgetMin and 60');
    }
  }
  if (typeof coverage.saturationReached !== 'boolean') {
    errors.push('researchCoverage.saturationReached must be true or false');
  }
  if (
    !Array.isArray(coverage.searchedQueries)
    || coverage.searchedQueries.length === 0
    || coverage.searchedQueries.some((query) => !isNonEmptyString(query))
  ) {
    errors.push('researchCoverage.searchedQueries must be a non-empty list of strings');
  }
  if (coverage.sourcesFetched > coverage.sourceBudgetMax) {
    errors.push('researchCoverage.sourcesFetched must not exceed sourceBudgetMax');
  }
  if (coverage.sourcesRetained !== corpus.length) {
    errors.push(`researchCoverage.sourcesRetained must equal evidenceCorpus.length (${corpus.length})`);
  }
  if (coverage.memoSourcesUsed !== sources.length) {
    errors.push(`researchCoverage.memoSourcesUsed must equal sources.length (${sources.length})`);
  }
  if (corpus.length < 18) errors.push('evidenceCorpus must retain at least 18 useful sources');
  if (sources.length < 12 || sources.length > 30) errors.push('sources must contain 12 to 30 decision-useful sources');

  const publishers = new Set(corpus.map((item) => item?.publisher).filter(isNonEmptyString));
  const sourceTypes = new Set(corpus.map((item) => item?.sourceType).filter(isNonEmptyString));
  const primaryCount = corpus.filter((item) => item?.isPrimary === true).length;
  const independentCount = corpus.length - primaryCount;
  if (coverage.uniquePublishers !== publishers.size) {
    errors.push(`researchCoverage.uniquePublishers must equal ${publishers.size}`);
  }
  if (coverage.sourceTypeCount !== sourceTypes.size) {
    errors.push(`researchCoverage.sourceTypeCount must equal ${sourceTypes.size}`);
  }
  if (coverage.primarySourceCount !== primaryCount) {
    errors.push(`researchCoverage.primarySourceCount must equal ${primaryCount}`);
  }
  if (coverage.independentSourceCount !== independentCount) {
    errors.push(`researchCoverage.independentSourceCount must equal ${independentCount}`);
  }
  if (publishers.size < 10) errors.push('research requires at least 10 unique publishers');
  if (sourceTypes.size < 4) errors.push('research requires at least 4 source types');
  if (primaryCount < 3) errors.push('research requires at least 3 primary sources');
  if (independentCount < 6) errors.push('research requires at least 6 independent sources');
  if (coverage.sourcesFetched < coverage.sourceBudgetMin && !isNonEmptyString(coverage.coverageGap)) {
    errors.push('researchCoverage.coverageGap is required when sourcesFetched is below sourceBudgetMin');
  }

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
