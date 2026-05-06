#!/usr/bin/env node
// Fail fast if any ideas/<run>/ folder is missing required YAML files,
// contains unexpected YAML artifacts, or has YAML that cannot be parsed.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDEAS_DIR = resolve(__dirname, '../../ideas');
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

  if (failures.length || unexpected.length || parseFailures.length || consistencyFailures.length || schemaShapeFailures.length) {
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
    if (schemaShapeFailures.length) {
      console.error('[check:ideas] localized schema shape failures:');
      for (const f of schemaShapeFailures.slice(0, 200)) console.error(`  - ${f}`);
      if (schemaShapeFailures.length > 200) console.error(`  - ...and ${schemaShapeFailures.length - 200} more`);
    }
    process.exit(1);
  }

  console.log(`[check:ideas] ✓ ${runs.length} run(s) verified.`);
  process.exit(0);
} catch (e) {
  console.error(`[check:ideas] fatal error: ${e.message}`);
  process.exit(1);
}
