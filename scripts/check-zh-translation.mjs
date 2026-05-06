#!/usr/bin/env node
// Deterministic linter for *.zh.yaml translation artifacts.
//
// Catches the four most common bugs we see in agent-produced Chinese
// translations of report YAML files:
//
//   R1  colon-paste maps      A list item like `- Some sentence: details`
//                             parses as { "Some sentence": "details" } and the
//                             translator only translates the value, leaving the
//                             key (English) and broken structure in place.
//   R2  enum mistranslation   `riskHeatmap[].likelihood|impact` are enum keys
//                             that the website normalizes via startsWith('l',
//                             'm', 'h'). Translating them to Chinese silently
//                             breaks the heatmap.
//   R3  cross-ref drift       `signalRefs` entries must mirror the translated
//                             `signals[].title` strings inside the same idea
//                             file. A stale English ref is a dead link.
//   R4  untranslated label    Categorical labels we always render verbatim
//                             (e.g. `incumbentClass`, `topRisks`, `risk`,
//                             role names) must contain at least one CJK
//                             character.
//
// Usage:
//   node scripts/check-zh-translation.mjs <reportFolder>
//   node scripts/check-zh-translation.mjs <ideasRoot>          # scans every
//                                                              # report folder
//
// Exit code is 0 when clean, 1 when issues are reported, 2 on bad invocation.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import yaml from 'js-yaml';

const ZH_FILES = [
  'idea.zh.yaml',
  'research.zh.yaml',
  'business-plan.zh.yaml',
  'financial-model.zh.yaml',
  'index.zh.yaml',
];

// Path patterns whose values are enum keys consumed by the website. They must
// stay ASCII (Low/Medium/High, positive/negative/neutral) regardless of
// language. We match by path so similarly-named narrative fields (e.g.
// `sensitivityCases[].impact` which holds a free-form description) are not
// flagged.
const ENUM_PATH_PATTERNS = [
  /(^|\.)(riskHeatmap|topRisks|risks|riskRegister)\[\d+\]\.(likelihood|impact)$/,
  /(^|\.)pestle\[\d+\]\.impact$/,
];

// Fields whose values are short categorical labels rendered verbatim. They
// must contain at least one CJK character in *.zh.yaml.
const LABEL_KEYS = new Set([
  'incumbentClass',
  'horizon',
  'role',
]);

// Fields that hold cross-reference titles which must exactly match a
// `signals[].title` value in the same file.
const SIGNAL_REF_KEYS = new Set(['signalRefs']);

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const ASCII_LETTER_RE = /[A-Za-z]/;

function usage() {
  console.error('Usage: node scripts/check-zh-translation.mjs <reportFolderOrIdeasRoot>');
  process.exit(2);
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function listReportFolders(root) {
  return readdirSync(root)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .map((name) => join(root, name))
    .filter((path) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    });
}

function collectSignalTitles(parsed) {
  // Walk every `signals` array we find and collect each item.title.
  const titles = new Set();
  function visit(node) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isPlainObject(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'signals' && Array.isArray(value)) {
        for (const item of value) {
          if (isPlainObject(item) && typeof item.title === 'string') {
            titles.add(item.title);
          }
        }
      }
      visit(value);
    }
  }
  visit(parsed);
  return titles;
}

function walk(node, path, visit) {
  visit(node, path);
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}[${i}]`, visit));
    return;
  }
  if (!isPlainObject(node)) return;
  for (const [key, value] of Object.entries(node)) {
    walk(value, path ? `${path}.${key}` : key, visit);
  }
}

function lintFile(absPath, signalTitles) {
  const issues = [];
  let raw;
  try {
    raw = readFileSync(absPath, 'utf8');
  } catch (err) {
    issues.push({ rule: 'IO', path: '', message: `failed to read: ${err.message}` });
    return issues;
  }
  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    issues.push({ rule: 'YAML', path: '', message: `parse error: ${err.message}` });
    return issues;
  }

  walk(parsed, '', (node, path) => {
    // R1 colon-paste: single-key plain object whose key contains whitespace.
    if (isPlainObject(node)) {
      const keys = Object.keys(node);
      if (keys.length === 1 && /\s/.test(keys[0])) {
        issues.push({
          rule: 'R1-colon-paste',
          path: path || '<root>',
          message: `unquoted English-keyed mapping; key="${keys[0]}". Re-write source as a quoted string and translate the whole sentence.`,
        });
      }
    }
  });

  walk(parsed, '', (node, path) => {
    if (!isPlainObject(node)) return;
    for (const [key, value] of Object.entries(node)) {
      const childPath = `${path ? path + '.' : ''}${key}`;
      // R2 enum mistranslation
      if (typeof value === 'string' && ENUM_PATH_PATTERNS.some((re) => re.test(childPath))) {
        if (CJK_RE.test(value)) {
          issues.push({
            rule: 'R2-enum-translated',
            path: childPath,
            message: `enum field must stay ASCII (Low/Medium/High or positive/negative/neutral); got "${value}".`,
          });
        }
      }
      // R3 signalRefs drift
      if (SIGNAL_REF_KEYS.has(key) && Array.isArray(value)) {
        for (const ref of value) {
          if (typeof ref !== 'string') continue;
          if (!signalTitles.has(ref)) {
            issues.push({
              rule: 'R3-signalref-drift',
              path: childPath,
              message: `signalRef "${ref}" does not match any translated signals[].title in this file.`,
            });
          }
        }
      }
      // R4 untranslated label
      if (LABEL_KEYS.has(key) && typeof value === 'string') {
        if (ASCII_LETTER_RE.test(value) && !CJK_RE.test(value)) {
          issues.push({
            rule: 'R4-label-untranslated',
            path: childPath,
            message: `label "${value}" has no Chinese characters.`,
          });
        }
      }
    }
  });

  return issues;
}

function lintFolder(folder) {
  const folderName = basename(folder);
  const fileIssues = new Map();

  // First pass: collect translated signal titles from idea.zh.yaml.
  let signalTitles = new Set();
  const ideaPath = join(folder, 'idea.zh.yaml');
  if (existsSync(ideaPath)) {
    try {
      const parsed = yaml.load(readFileSync(ideaPath, 'utf8'));
      signalTitles = collectSignalTitles(parsed);
    } catch {
      // parse errors are reported in lintFile below.
    }
  }

  for (const fname of ZH_FILES) {
    const path = join(folder, fname);
    if (!existsSync(path)) {
      fileIssues.set(fname, [{ rule: 'MISSING', path: '', message: 'file not found' }]);
      continue;
    }
    const issues = lintFile(path, signalTitles);
    if (issues.length > 0) fileIssues.set(fname, issues);
  }

  return { folder: folderName, fileIssues };
}

function reportFolderResult({ folder, fileIssues }) {
  if (fileIssues.size === 0) return 0;
  console.log(`\n${folder}`);
  let count = 0;
  for (const [fname, issues] of fileIssues) {
    console.log(`  ${fname}`);
    for (const issue of issues) {
      const loc = issue.path ? ` @ ${issue.path}` : '';
      console.log(`    [${issue.rule}]${loc} ${issue.message}`);
      count += 1;
    }
  }
  return count;
}

function main() {
  const arg = process.argv[2];
  if (!arg) usage();
  const target = resolve(arg);
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    console.error(`[check-zh-translation] not a directory: ${target}`);
    process.exit(2);
  }

  // Detect mode: report folder vs ideas root. A report folder contains
  // idea.yaml; an ideas root contains report subfolders.
  const isReportFolder = existsSync(join(target, 'idea.yaml'));
  const folders = isReportFolder ? [target] : listReportFolders(target);

  let totalIssues = 0;
  let scanned = 0;
  for (const folder of folders) {
    const result = lintFolder(folder);
    totalIssues += reportFolderResult(result);
    scanned += 1;
  }

  if (totalIssues === 0) {
    console.log(`[check-zh-translation] ✓ ${scanned} folder(s) clean.`);
    process.exit(0);
  }
  console.log(`\n[check-zh-translation] ✗ ${totalIssues} issue(s) across ${scanned} folder(s).`);
  process.exit(1);
}

main();
