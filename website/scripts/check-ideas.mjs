#!/usr/bin/env node
// Fail fast if any ideas/<run>/ folder is missing required YAML files,
// contains unexpected YAML artifacts, or has YAML that cannot be parsed.
import { readdirSync, statSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDEAS_DIR = resolve(__dirname, '../../ideas');
const REPO_ROOT = resolve(__dirname, '../..');
const CACHE_FILE = join(REPO_ROOT, '.cache', 'check-ideas.json');
// Bump when validation rules below change so cached digests invalidate everywhere.
const CHECK_VERSION = '1';
const USE_CACHE = process.env.CHECK_IDEAS_NO_CACHE !== '1';

function folderDigest(dir, files) {
  const hash = createHash('sha1').update(CHECK_VERSION).update('\0');
  for (const file of [...files].sort()) {
    if (!file.endsWith('.yaml')) continue;
    hash.update(file).update('\0');
    try {
      hash.update(readFileSync(join(dir, file)));
    } catch {
      hash.update('<<unreadable>>');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

function loadCache() {
  if (!USE_CACHE) return {};
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    if (raw && raw.version === CHECK_VERSION && raw.folders && typeof raw.folders === 'object') {
      return raw.folders;
    }
  } catch {
    // Missing or unreadable cache: fall through and re-validate everything.
  }
  return {};
}

function saveCache(folders) {
  if (!USE_CACHE) return;
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ version: CHECK_VERSION, folders }, null, 2));
  } catch (e) {
    console.warn(`[check:ideas] could not persist cache: ${e.message}`);
  }
}
const REQUIRED_ENGLISH = [
  'idea.yaml',
  'research.yaml',
  'business-plan.yaml',
  'financial-model.yaml',
  'index.yaml',
];
const REQUIRED_LOCALIZED = [
  'idea.zh.yaml',
  'research.zh.yaml',
  'business-plan.zh.yaml',
  'financial-model.zh.yaml',
  'index.zh.yaml',
];
const REQUIRED = [...REQUIRED_ENGLISH, ...REQUIRED_LOCALIZED];
const ALLOWED_YAML = new Set(REQUIRED);

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function fixColonPaste(value) {
  if (Array.isArray(value)) return value.map(fixColonPaste);
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && /\s/.test(keys[0])) {
      const key = keys[0];
      const nested = value[key];
      if (typeof nested === 'string') return `${key}: ${nested}`;
      if (nested == null) return key;
    }

    const out = {};
    for (const key of keys) out[key] = fixColonPaste(value[key]);
    return out;
  }
  return value;
}

function compareSchemaShape(source, localized, label, failures, path = '$') {
  if (failures.length > 1000) return;

  if (isPlainObject(source)) {
    if (!isPlainObject(localized)) {
      failures.push(`${label} ${path}: expected object shape`);
      return;
    }

    const sourceKeys = Object.keys(source);
    const localizedKeys = Object.keys(localized);
    const localizedKeySet = new Set(localizedKeys);
    for (const key of sourceKeys) {
      if (!localizedKeySet.has(key)) {
        failures.push(`${label} ${path}: missing key ${key}`);
        continue;
      }
      compareSchemaShape(source[key], localized[key], label, failures, `${path}.${key}`);
    }
    for (const key of localizedKeys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        failures.push(`${label} ${path}: unexpected key ${key}`);
      }
    }
    return;
  }

  if (Array.isArray(source)) {
    if (!Array.isArray(localized)) {
      failures.push(`${label} ${path}: expected array shape`);
      return;
    }

    const sourceObject = source.find(isPlainObject);
    const localizedObject = localized.find(isPlainObject);
    if (sourceObject && !localizedObject) {
      failures.push(`${label} ${path}: expected array item object shape`);
      return;
    }
    if (sourceObject && localizedObject) {
      compareSchemaShape(sourceObject, localizedObject, label, failures, `${path}[]`);
    }
    return;
  }

  if (isPlainObject(localized) || Array.isArray(localized)) {
    failures.push(`${label} ${path}: expected scalar shape`);
  }
}

function assertNonEmptyString(parsed, fileLabel, field, failures) {
  const value = parsed?.[field];
  if (value instanceof Date) return;
  if (typeof value !== 'string' || value.trim().length === 0) {
    failures.push(`${fileLabel}: ${field} must be a non-empty string`);
  }
}

function collectSourceRefs(node, path, refs, failures, label) {
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectSourceRefs(child, `${path}[${i}]`, refs, failures, label));
    return;
  }
  if (!isPlainObject(node)) return;

  for (const [key, value] of Object.entries(node)) {
    const childPath = `${path}.${key}`;
    if (key === 'sourceRefs') {
      if (!Array.isArray(value)) {
        failures.push(`${label} ${childPath}: sourceRefs must be an array`);
        continue;
      }
      value.forEach((ref, i) => refs.push({ ref, path: `${childPath}[${i}]` }));
      continue;
    }
    collectSourceRefs(value, childPath, refs, failures, label);
  }
}

function collectInlineCitationRefs(node, path, refs) {
  if (typeof node === 'string') {
    for (const match of node.matchAll(/\[(\d+)\]/g)) {
      refs.push({ ref: match[1], path });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectInlineCitationRefs(child, `${path}[${i}]`, refs));
    return;
  }
  if (!isPlainObject(node)) return;

  for (const [key, value] of Object.entries(node)) {
    if (path === '$' && (key === 'sources' || key === 'evidenceCorpus')) continue;
    collectInlineCitationRefs(value, `${path}.${key}`, refs);
  }
}

function validateResearchSourceRefs(run, fileName, parsed, failures) {
  if (!isPlainObject(parsed)) return;
  if (!Array.isArray(parsed.sources)) return;

  const label = `${run}/${fileName}`;
  const sourceIds = new Set();
  const evidenceIds = new Set();
  for (const [i, source] of parsed.sources.entries()) {
    if (!isPlainObject(source) || source.id == null) {
      failures.push(`${label} $.sources[${i}]: source must have an id`);
      continue;
    }
    const id = String(source.id);
    if (sourceIds.has(id)) failures.push(`${label} $.sources[${i}]: duplicate source id ${id}`);
    sourceIds.add(id);
  }

  if (Array.isArray(parsed.evidenceCorpus)) {
    for (const [i, evidence] of parsed.evidenceCorpus.entries()) {
      if (!isPlainObject(evidence) || evidence.id == null) {
        failures.push(`${label} $.evidenceCorpus[${i}]: evidence item must have an id`);
        continue;
      }
      const id = String(evidence.id);
      if (evidenceIds.has(id)) failures.push(`${label} $.evidenceCorpus[${i}]: duplicate evidence id ${id}`);
      evidenceIds.add(id);
    }
  }

  const refs = [];
  collectSourceRefs(parsed, '$', refs, failures, label);
  for (const { ref, path } of refs) {
    if (!sourceIds.has(String(ref)) && !evidenceIds.has(String(ref))) {
      failures.push(`${label} ${path}: sourceRef ${ref} does not match any sources[].id or evidenceCorpus[].id`);
    }
  }

  const inlineRefs = [];
  collectInlineCitationRefs(parsed, '$', inlineRefs);
  for (const { ref, path } of inlineRefs) {
    if (!sourceIds.has(String(ref))) {
      failures.push(`${label} ${path}: inline citation [${ref}] does not match any sources[].id`);
    }
  }
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function closeEnough(a, b, tolerance = 0.2) {
  const left = numeric(a);
  const right = numeric(b);
  return left != null && right != null && Math.abs(left - right) <= tolerance;
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + (numeric(row?.[key]) ?? 0), 0);
}

function validateRating(run, fileName, parsed, failures) {
  if (!isPlainObject(parsed)) return;
  const label = `${run}/${fileName}`;
  const dimensions = parsed.rating?.dimensions;
  if (!isPlainObject(dimensions)) return;

  const market = numeric(dimensions.market?.score);
  const differentiation = numeric(dimensions.differentiation?.score);
  const execution = numeric(dimensions.execution?.score);
  const timeliness = numeric(dimensions.timeliness?.score);
  const overall = numeric(parsed.rating?.overall);
  if ([market, differentiation, execution, timeliness, overall].some((v) => v == null)) {
    failures.push(`${label}: rating scores must be numeric`);
    return;
  }

  const expected = Math.round((0.30 * market + 0.30 * differentiation + 0.25 * execution + 0.15 * timeliness) * 10) / 10;
  if (!closeEnough(overall, expected, 0.05)) {
    failures.push(`${label}: rating.overall ${overall} must equal weighted score ${expected}`);
  }
}

function validateRiskCount(run, fileName, parsed, field, failures) {
  if (!isPlainObject(parsed)) return;
  const value = parsed[field];
  if (!Array.isArray(value) || value.length !== 3) {
    failures.push(`${run}/${fileName}: ${field} must contain exactly 3 items`);
  }
}

function validateFinancialModel(run, parsed, failures) {
  if (!isPlainObject(parsed)) return;
  const label = `${run}/financial-model.yaml`;
  const monthly = Array.isArray(parsed.y1Monthly) ? parsed.y1Monthly : [];
  const quarterly = Array.isArray(parsed.y2y3Quarterly) ? parsed.y2y3Quarterly : [];

  if (monthly.length !== 12) failures.push(`${label}: y1Monthly must contain 12 rows; got ${monthly.length}`);
  if (quarterly.length !== 8) failures.push(`${label}: y2y3Quarterly must contain 8 rows; got ${quarterly.length}`);

  const yearRows = {
    y1: monthly,
    y2: quarterly.filter((row) => String(row?.quarter ?? '').toUpperCase().includes('Y2')),
    y3: quarterly.filter((row) => String(row?.quarter ?? '').toUpperCase().includes('Y3')),
  };

  for (const [year, rows] of Object.entries(yearRows)) {
    const totals = parsed.totals?.[year];
    if (!isPlainObject(totals)) {
      failures.push(`${label}: totals.${year} must be present`);
      continue;
    }
    for (const key of ['revenueK', 'ebitdaK']) {
      const actual = sumBy(rows, key);
      if (!closeEnough(actual, totals[key])) {
        failures.push(`${label}: totals.${year}.${key} ${totals[key]} must equal row sum ${actual.toFixed(1)}`);
      }
    }
    const lastCash = rows.length > 0 ? rows[rows.length - 1]?.cashEopK : null;
    if (lastCash != null && !closeEnough(lastCash, totals.cashEopK)) {
      failures.push(`${label}: totals.${year}.cashEopK ${totals.cashEopK} must equal final period cash ${lastCash}`);
    }
  }

  const useOfFunds = Array.isArray(parsed.fundingAsk?.useOfFunds) ? parsed.fundingAsk.useOfFunds : [];
  if (useOfFunds.length > 0) {
    const percentageTotal = sumBy(useOfFunds, 'percentage');
    if (Math.abs(percentageTotal - 100) > 2) {
      failures.push(`${label}: fundingAsk.useOfFunds percentages must sum to ~100; got ${percentageTotal}`);
    }
    const amountTotal = sumBy(useOfFunds, 'amountUsd');
    const askUsd = (numeric(parsed.fundingAsk?.amountM) ?? 0) * 1_000_000;
    if (askUsd > 0 && Math.abs(amountTotal - askUsd) / askUsd > 0.05) {
      failures.push(`${label}: fundingAsk.useOfFunds amount $${amountTotal} must reconcile to ask $${askUsd}`);
    }
  }

  const modelSanity = Array.isArray(parsed.modelSanity) ? parsed.modelSanity : [];
  const expectedChecks = ['Revenue engine', 'Must go right', 'Model breaks if', 'Next-round proof'];
  const actualChecks = modelSanity.map((row) => String(row?.checkName ?? ''));
  if (modelSanity.length !== 4 || !expectedChecks.every((check) => actualChecks.includes(check))) {
    failures.push(`${label}: modelSanity must contain ${expectedChecks.join(', ')}`);
  }
}

try {
  if (!existsSync(IDEAS_DIR)) {
    console.warn(`[check:ideas] ${IDEAS_DIR} not found; nothing to check.`);
    process.exit(0);
  }

  let runs = [];
  try {
    runs = readdirSync(IDEAS_DIR).filter((name) => {
      const p = join(IDEAS_DIR, name);
      try {
        return statSync(p).isDirectory() && !name.startsWith('.') && !name.startsWith('_');
      } catch (e) {
        console.warn(`[check:ideas] skipped ${name}: ${e.message}`);
        return false;
      }
    });
  } catch (e) {
    console.error(`[check:ideas] failed to read ${IDEAS_DIR}: ${e.message}`);
    process.exit(1);
  }

  const failures = [];
  const unexpected = [];
  const parseFailures = [];
  const consistencyFailures = [];
  const schemaShapeFailures = [];
  const referenceFailures = [];
  const modelFailures = [];
  const cached = loadCache();
  const nextDigests = {};
  let cacheHits = 0;
  for (const run of runs) {
    const dir = join(IDEAS_DIR, run);
    const parsed = new Map();
    const files = readdirSync(dir).filter((file) => {
      try {
        return statSync(join(dir, file)).isFile();
      } catch (e) {
        console.warn(`[check:ideas] skipped ${run}/${file}: ${e.message}`);
        return false;
      }
    });

    const digest = folderDigest(dir, files);
    nextDigests[run] = digest;
    if (cached[run] === digest) {
      cacheHits++;
      continue;
    }

    for (const file of REQUIRED) {
      const p = join(IDEAS_DIR, run, file);
      if (!existsSync(p)) {
        failures.push(`${run}/${file}`);
      }
    }

    for (const file of files) {
      if (!file.endsWith('.yaml')) continue;
      if (!ALLOWED_YAML.has(file)) {
        unexpected.push(`${run}/${file}`);
      }
      try {
        parsed.set(file, fixColonPaste(yaml.load(readFileSync(join(dir, file), 'utf8'))));
      } catch (e) {
        parseFailures.push(`${run}/${file}: ${e.message.split('\n')[0]}`);
      }
    }

    const index = parsed.get('index.yaml');
    const idea = parsed.get('idea.yaml');
    if (index && typeof index === 'object' && idea && typeof idea === 'object') {
      const indexSlug = String(index.slug || '');
      const ideaSlug = String(idea.slug || '');
      if (indexSlug && ideaSlug && indexSlug !== ideaSlug) {
        consistencyFailures.push(`${run}: index.yaml slug (${indexSlug}) does not match idea.yaml slug (${ideaSlug})`);
      }
    }

    if (index && typeof index === 'object' && index.files && typeof index.files === 'object') {
      const expectedFiles = {
        idea: 'idea.yaml',
        research: 'research.yaml',
        businessPlan: 'business-plan.yaml',
        financialModel: 'financial-model.yaml',
      };
      for (const [key, defaultFile] of Object.entries(expectedFiles)) {
        const referenced = String(index.files[key] || defaultFile);
        if (!files.includes(referenced)) {
          consistencyFailures.push(`${run}: index.yaml files.${key} references missing ${referenced}`);
        }
      }
    }

    validateResearchSourceRefs(run, 'research.yaml', parsed.get('research.yaml'), referenceFailures);
    validateResearchSourceRefs(run, 'research.zh.yaml', parsed.get('research.zh.yaml'), referenceFailures);
    validateRating(run, 'index.yaml', parsed.get('index.yaml'), modelFailures);
    validateRating(run, 'index.zh.yaml', parsed.get('index.zh.yaml'), modelFailures);
    validateRiskCount(run, 'idea.yaml', parsed.get('idea.yaml'), 'topRisks', modelFailures);
    validateRiskCount(run, 'idea.zh.yaml', parsed.get('idea.zh.yaml'), 'topRisks', modelFailures);
    validateRiskCount(run, 'index.yaml', parsed.get('index.yaml'), 'topRisks', modelFailures);
    validateRiskCount(run, 'index.zh.yaml', parsed.get('index.zh.yaml'), 'topRisks', modelFailures);
    validateFinancialModel(run, parsed.get('financial-model.yaml'), modelFailures);

    for (const englishFile of REQUIRED_ENGLISH) {
      const localizedFile = englishFile.replace(/\.yaml$/, '.zh.yaml');
      const english = parsed.get(englishFile);
      const localized = parsed.get(localizedFile);
      if (english && localized) {
        compareSchemaShape(english, localized, `${run}/${localizedFile}`, schemaShapeFailures);
      }
    }

    const localizedIndex = parsed.get('index.zh.yaml');
    if (localizedIndex && typeof localizedIndex === 'object') {
      for (const field of ['slug', 'date', 'topic', 'pitch', 'kicker']) {
        assertNonEmptyString(localizedIndex, `${run}/index.zh.yaml`, field, schemaShapeFailures);
      }
    }
  }

  if (failures.length || unexpected.length || parseFailures.length || consistencyFailures.length || referenceFailures.length || modelFailures.length || schemaShapeFailures.length) {
    if (failures.length) {
      console.error('[check:ideas] missing required artifact files:');
      for (const f of failures) console.error(`  - ideas/${f}`);
    }
    if (unexpected.length) {
      console.error('[check:ideas] unexpected YAML artifact files:');
      for (const f of unexpected) console.error(`  - ideas/${f}`);
    }
    if (parseFailures.length) {
      console.error('[check:ideas] YAML parse failures:');
      for (const f of parseFailures) console.error(`  - ideas/${f}`);
    }
    if (consistencyFailures.length) {
      console.error('[check:ideas] artifact consistency failures:');
      for (const f of consistencyFailures) console.error(`  - ${f}`);
    }
    if (referenceFailures.length) {
      console.error('[check:ideas] citation reference failures:');
      for (const f of referenceFailures.slice(0, 200)) console.error(`  - ${f}`);
      if (referenceFailures.length > 200) console.error(`  - ...and ${referenceFailures.length - 200} more`);
    }
    if (modelFailures.length) {
      console.error('[check:ideas] model consistency failures:');
      for (const f of modelFailures.slice(0, 200)) console.error(`  - ${f}`);
      if (modelFailures.length > 200) console.error(`  - ...and ${modelFailures.length - 200} more`);
    }
    if (schemaShapeFailures.length) {
      console.error('[check:ideas] localized schema shape failures:');
      for (const f of schemaShapeFailures.slice(0, 200)) console.error(`  - ${f}`);
      if (schemaShapeFailures.length > 200) console.error(`  - ...and ${schemaShapeFailures.length - 200} more`);
    }
    // Don't persist the cache: we want failed folders re-checked next run.
    process.exit(1);
  }

  saveCache(nextDigests);
  const reused = cacheHits;
  const checked = runs.length - reused;
  console.log(`[check:ideas] ✓ ${runs.length} run(s) verified (${checked} re-checked, ${reused} cached).`);
  process.exit(0);
} catch (e) {
  console.error(`[check:ideas] fatal error: ${e.message}`);
  process.exit(1);
}
