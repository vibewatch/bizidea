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
//   node scripts/check-zh-translations.mjs <reportFolder>
//   node scripts/check-zh-translations.mjs <ideasRoot>         # scans every
//                                                              # report folder
//   node scripts/check-zh-translations.mjs --pair <source.yaml> <target.zh.yaml>
//   node scripts/check-zh-translations.mjs --pair --strict-editor <source.yaml> <target.zh.yaml>
//
// Exit code is 0 when clean, 1 when issues are reported, 2 on bad invocation.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
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
// flagged. `topRisks` is intentionally absent: in `idea.yaml` it is
// `[ {name, description, mitigation} ]` (no enum) and in `index.yaml` it is
// `[string]`. `riskHeatmap` is also absent: the field was removed from the
// business-plan schema, but old reports may still carry it; tolerate the
// historical Chinese values rather than retroactively flagging them.
const ENUM_PATH_PATTERNS = [
  /(^|\.)risks\[\d+\]\.(likelihood|impact)$/,
  /(^|\.)pestle\[\d+\]\.impact$/,
];

// Path patterns whose values are short categorical labels rendered verbatim.
// They must contain at least one CJK character in *.zh.yaml. Matched by full
// path so that similarly-named narrative fields (e.g. an arbitrary `role:`
// enum) are not flagged.
const LABEL_PATH_PATTERNS = [
  /(^|\.)incumbentThesis\[\d+\]\.incumbentClass$/,
  /(^|\.)team\[\d+\]\.role$/,
  /(^|\.)experimentRoadmap\[\d+\]\.horizon$/,
  /(^|\.)milestones\[\d+\]\.horizon$/,
];

// Top-level string-array paths whose items are reader-facing labels and must
// be translated. In `index.zh.yaml`, `topRisks` is `[string]` and is rendered
// directly on the website; English strings here would leak into the Chinese
// page. In `idea.zh.yaml`, `topRisks` is a list of objects (no string items)
// so this pattern simply does not match — no false positive.
const LABEL_ITEM_PATH_PATTERNS = [
  /^topRisks\[\d+\]$/,
];

// Fields that hold cross-reference titles which must exactly match a
// `signals[].title` value in the same file.
const SIGNAL_REF_KEYS = new Set(['signalRefs']);

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const ASCII_LETTER_RE = /[A-Za-z]/;
const ENGLISH_PROSE_RE = /\b[a-z]{3,}\b(?:[\s,;:()[\]'"-]+\b[a-z]{3,}\b){3,}/i;
const NUMBER_TOKEN_RE = /(?:[$€£¥]\s*)?\d+(?:[.,]\d+)*(?:(?:%|[KMB]|[x×]|bps)|\s?(?:months?|years?|days?|mo|m))?/g;
const TRANSLATIONESE_PATTERNS = [
  /对于.{0,18}而言/,
  /对.{0,18}来说/,
  /通过.{0,24}来/,
  /在.{0,24}的过程中/,
  /被设计为/,
  /被认为是/,
  /进行(?:验证|分析|评估|尝试|测试)/,
  /形成(?:机制|优势|闭环)/,
  /这意味着/,
  /这表明/,
];
const STRICT_TRANSLATIONESE_PATTERNS = [
  /正在.{0,18}中/,
  /做出(?:决定|决策)/,
  /产生影响/,
  /实现(?:增长|提升|改善)/,
  /呈现.{0,12}特征/,
  /围绕.{0,12}展开/,
  /予以/,
  /在.{0,12}层面/,
  /体现了/,
  /这构成了/,
  /关键数字包括/,
];
const PROTECTED_NARRATIVE_TERM_RE = /\b(?:[A-Z]{2,}[A-Z0-9-]*|[A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*|Excel|Word|Deltek|SharePoint|Salesforce|Microsoft|Oracle|Amazon|Google)\b/g;
const TRANSLATABLE_GENERIC_TERM_RE = /^(?:AI|IT|VP|COO|COOs|ROI|TAM|KPI|KPIs|ICP|ACV|ACVs|RFP|GovCon|FY\d*)$/;
const STRICT_QUALIFIER_RULES = [
  { source: /\b(?:roughly|approximately)\b/gi, target: /(约|大约|大致|大概)/, label: 'approximately' },
  { source: /\bestimat(?:e|ed|es|ing)\b/gi, target: /(估计|估算|预计|测算|约|大约|大致|大概)/, label: 'estimated' },
  { source: /\bat least\b/gi, target: /(至少|不低于|以上|未达)/, label: 'at least' },
  { source: /\bat most\b/gi, target: /(至多|最多|不超过)/, label: 'at most' },
  { source: /\b(?:likely|probably)\b/gi, target: /(可能|很可能|大概率|多半|往往)/, label: 'likely' },
  {
    source: /\b(?:(?:do|does|did|have|has|had)\s+)?not yet\b/gi,
    target: /(尚未|还没有|还未|仍未|目前没有|目前尚无|还不能|尚不能|仍不足|尚不足|还不足|无法说明|未得到验证|未获验证)/,
    label: 'not yet',
  },
  {
    source: /\b(?:unproven|not proven|do(?:es)? not prove|cannot prove)\b/gi,
    target: /(未经证实|未获证实|尚未证明|不能证明|无法证明|未能证明|未得到验证)/,
    label: 'unproven',
  },
  { source: /\bno public\b/gi, target: /(没有公开|无公开|尚无公开|未见公开|缺少公开)/, label: 'no public' },
  { source: /\breportedly\b/gi, target: /(据报道|据称)/, label: 'reportedly' },
  { source: /\bclaims?\b/gi, target: /(声称|称|说法|主张)/, label: 'claim' },
];
const VERBATIM_PATH_PATTERNS = [
  /(^|\.)slug$/,
  /(^|\.)sector$/,
  /(^|\.)kicker$/,
  /(^|\.)currency$/,
  /(^|\.)date$/,
  /(^|\.)modelStartMonth$/,
  /(^|\.)timeWindow$/,
  /(^|\.)timeWindowLabel$/,
  /(^|\.)topicScope$/,
  /(^|\.)eventType$/,
  /(^|\.)championDimension$/,
  /(^|\.)frontierStatus$/,
  /(^|\.)dedupeStatus$/,
  /(^|\.)fundingAsk\.round$/,
  /(^|\.)primaryCompanies\[\d+\]$/,
  /(^|\.)topSourceUrls\[\d+\]$/,
  /(^|\.)eventKeys\[\d+\]$/,
  /(^|\.)archetypesConsidered\[\d+\]$/,
  /(^|\.)nearestHistoricalIdeas\[\d+\]\.(slug|similarity)$/,
  /(^|\.)(publisher|company)$/,
  /(^|\.)files\./,
  /(^|\.)url$/,
  /(^|\.)mermaid$/,
  /(^|\.)sourceType$/,
  /(^|\.)reputationTier$/,
  /(^|\.)topicBucket$/,
];
const TERMINOLOGY_RULES = [
  { source: /\bincumbents?\b/i, target: /(现有厂商|在位企业)/, label: 'incumbent' },
  { source: /\bwedge\b/i, target: /(切口|切入点)/, label: 'wedge' },
  { source: /\bbeachhead\b/i, target: /滩头市场/, label: 'beachhead' },
  { source: /\bwillingness to pay\b/i, target: /付费意愿/, label: 'willingness to pay' },
  { source: /\bunit economics\b/i, target: /单位经济模型/, label: 'unit economics' },
];

function usage() {
  console.error('Usage: node scripts/check-zh-translations.mjs <reportFolderOrIdeasRoot>');
  console.error('   or: node scripts/check-zh-translations.mjs --pair <source.yaml> <target.zh.yaml>');
  console.error('   or: node scripts/check-zh-translations.mjs --pair --strict-editor <source.yaml> <target.zh.yaml>');
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

function valueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function normalizedNumberTokens(value) {
  return (String(value).match(NUMBER_TOKEN_RE) || []).map((token) => {
    const compact = token.replace(/\s+/g, '');
    if (!/[$€£¥]/.test(compact) && /(?:months?|years?|days?|mo|m)$/.test(compact)) {
      return compact.replace(/[A-Za-z]+$/, '');
    }
    return compact;
  });
}

function normalizeColonPaste(node) {
  if (Array.isArray(node)) return node.map(normalizeColonPaste);
  if (!isPlainObject(node)) return node;

  const keys = Object.keys(node);
  if (keys.length === 1 && /\s/.test(keys[0])) {
    const key = keys[0];
    const value = normalizeColonPaste(node[key]);
    if (typeof value === 'string') return `${key}: ${value}`;
    return `${key}: ${JSON.stringify(value)}`;
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, normalizeColonPaste(value)]),
  );
}

function countMatches(value, pattern) {
  return (String(value).match(pattern) || []).length;
}

function sourceWordCount(value) {
  return (String(value).match(/\b[A-Za-z]{2,}(?:-[A-Za-z]+)*\b/g) || []).length;
}

function translatedHanCount(value) {
  return (String(value).match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
}

function normalizedTranslatedText(value) {
  return String(value)
    .replace(/[\s，。：；！？、（）「」『』【】《》“”‘’"'`~!@#$%^&*()_+\-=[\]{}|\\/:;,.<>?]+/g, '')
    .toLowerCase();
}

function lintAdvancedPair(source, translated, strictEditor = false) {
  const issues = [];
  const stringPairs = [];
  const normalizedSource = normalizeColonPaste(source);
  const normalizedTranslated = normalizeColonPaste(translated);

  function compare(sourceNode, translatedNode, path) {
    const sourceType = valueType(sourceNode);
    const translatedType = valueType(translatedNode);
    if (sourceType !== translatedType) {
      issues.push({
        rule: 'R5-shape-drift',
        path: path || '<root>',
        message: `type changed from ${sourceType} to ${translatedType}.`,
      });
      return;
    }

    if (Array.isArray(sourceNode)) {
      if (sourceNode.length !== translatedNode.length) {
        issues.push({
          rule: 'R5-shape-drift',
          path: path || '<root>',
          message: `array length changed from ${sourceNode.length} to ${translatedNode.length}.`,
        });
      }
      const length = Math.min(sourceNode.length, translatedNode.length);
      for (let i = 0; i < length; i += 1) compare(sourceNode[i], translatedNode[i], `${path}[${i}]`);
      return;
    }

    if (isPlainObject(sourceNode)) {
      const sourceKeys = Object.keys(sourceNode);
      const translatedKeys = Object.keys(translatedNode);
      const missing = sourceKeys.filter((key) => !(key in translatedNode));
      const extra = translatedKeys.filter((key) => !(key in sourceNode));
      if (missing.length > 0 || extra.length > 0) {
        issues.push({
          rule: 'R5-shape-drift',
          path: path || '<root>',
          message: `mapping keys changed; missing=[${missing.join(', ')}], extra=[${extra.join(', ')}].`,
        });
      }
      for (const key of sourceKeys) {
        if (key in translatedNode) compare(sourceNode[key], translatedNode[key], path ? `${path}.${key}` : key);
      }
      return;
    }

    if (typeof sourceNode === 'number' || typeof sourceNode === 'boolean' || sourceNode === null) {
      if (sourceNode !== translatedNode) {
        issues.push({
          rule: 'R6-value-drift',
          path,
          message: `non-narrative value changed from "${sourceNode}" to "${translatedNode}".`,
        });
      }
      return;
    }

    if (typeof sourceNode !== 'string') return;
    stringPairs.push({ path, source: sourceNode, translated: translatedNode });
    if (VERBATIM_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
      if (sourceNode !== translatedNode) {
        issues.push({
          rule: 'R6-value-drift',
          path,
          message: 'verbatim identifier or technical value changed.',
        });
      }
      return;
    }

    const sourceNumbers = normalizedNumberTokens(sourceNode);
    const translatedNumbers = normalizedNumberTokens(translatedNode);
    if (JSON.stringify(sourceNumbers) !== JSON.stringify(translatedNumbers)) {
      issues.push({
        rule: 'R7-number-drift',
        path,
        message: `numeric tokens changed from [${sourceNumbers.join(', ')}] to [${translatedNumbers.join(', ')}].`,
      });
    }

    if (ENGLISH_PROSE_RE.test(sourceNode) && !CJK_RE.test(translatedNode)) {
      issues.push({
        rule: 'R8-untranslated-prose',
        path,
        message: 'reader-facing English prose has no Chinese translation.',
      });
    } else if (ENGLISH_PROSE_RE.test(sourceNode) && sourceNode.trim() === translatedNode.trim()) {
      issues.push({
        rule: 'R8-untranslated-prose',
        path,
        message: 'reader-facing English prose was copied verbatim.',
      });
    }

    for (const pattern of TRANSLATIONESE_PATTERNS) {
      if (pattern.test(translatedNode)) {
        issues.push({
          rule: 'R9-translationese',
          path,
          message: `rewrite translation-flavored phrase matching ${pattern}.`,
        });
        break;
      }
    }

    if (/[\u3400-\u9fff]\s+[\u3400-\u9fff]/.test(translatedNode)) {
      issues.push({
        rule: 'R11-cjk-spacing',
        path,
        message: 'Chinese text contains an invalid space between Chinese characters.',
      });
    }

    if (CJK_RE.test(translatedNode) && /(?<![$A-Za-z])\d+(?:\.\d+)?m\b/.test(translatedNode)) {
      issues.push({
        rule: 'R12-unit-style',
        path,
        message: 'use natural Chinese duration units such as "个月", not lowercase "m".',
      });
    }

    for (const rule of TERMINOLOGY_RULES) {
      if (rule.source.test(sourceNode) && !rule.target.test(translatedNode)) {
        issues.push({
          rule: 'R10-terminology',
          path,
          message: `required Chinese rendering for "${rule.label}" is missing.`,
        });
      }
    }
  }

  compare(normalizedSource, normalizedTranslated, '');

  if (strictEditor) {
    const duplicateCandidates = new Map();

    for (const pair of stringPairs) {
      if (VERBATIM_PATH_PATTERNS.some((pattern) => pattern.test(pair.path))) continue;
      if (!ENGLISH_PROSE_RE.test(pair.source) || !CJK_RE.test(pair.translated)) continue;

      const protectedTerms = [
        ...new Set(
          (pair.source.match(PROTECTED_NARRATIVE_TERM_RE) || [])
            .map((term) => term.replace(/-+$/, ''))
            .filter((term) => term && !TRANSLATABLE_GENERIC_TERM_RE.test(term)),
        ),
      ];
      const missingTerms = protectedTerms.filter((term) => !pair.translated.includes(term));
      if (missingTerms.length > 0) {
        issues.push({
          rule: 'R13-protected-term-drift',
          path: pair.path,
          message: `protected narrative terms are missing: ${missingTerms.join(', ')}.`,
        });
      }

      const words = sourceWordCount(pair.source);
      const han = translatedHanCount(pair.translated);
      if (words >= 20 && han / words < 0.7) {
        issues.push({
          rule: 'R14-undertranslation',
          path: pair.path,
          message: `translation is unusually compressed (${han} Han characters for ${words} source tokens); verify that mechanisms, scope, and caveats were not dropped.`,
        });
      }

      for (const pattern of STRICT_TRANSLATIONESE_PATTERNS) {
        if (pattern.test(pair.translated)) {
          issues.push({
            rule: 'R9-translationese',
            path: pair.path,
            message: `rewrite strict-editor phrase matching ${pattern}.`,
          });
          break;
        }
      }

      for (const rule of STRICT_QUALIFIER_RULES) {
        const expected = countMatches(pair.source, rule.source);
        if (expected > 0 && !rule.target.test(pair.translated)) {
          issues.push({
            rule: 'R16-qualifier-drift',
            path: pair.path,
            message: `source qualifier "${rule.label}" is not explicit in the Chinese value.`,
          });
        }
      }

      if (words >= 15 && han >= 15) {
        const key = normalizedTranslatedText(pair.translated);
        if (!duplicateCandidates.has(key)) duplicateCandidates.set(key, []);
        duplicateCandidates.get(key).push(pair);
      }
    }

    for (const pairs of duplicateCandidates.values()) {
      const distinctSources = new Set(pairs.map((pair) => pair.source.trim()));
      if (pairs.length < 2 || distinctSources.size < 2) continue;
      for (const pair of pairs) {
        issues.push({
          rule: 'R15-duplicate-collapse',
          path: pair.path,
          message: `distinct source passages collapsed into the same Chinese sentence at ${pairs.map((item) => item.path).join(', ')}.`,
        });
      }
    }
  }

  return issues;
}

function lintFile(absPath, signalTitles, sourcePath, advanced, strictEditor = false) {
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
    // R4 untranslated label on top-level string-array items (e.g.
    // `topRisks[0]` in `index.zh.yaml`). Object-keyed labels are handled by
    // the second walk below.
    if (typeof node === 'string' && LABEL_ITEM_PATH_PATTERNS.some((re) => re.test(path))) {
      if (ASCII_LETTER_RE.test(node) && !CJK_RE.test(node)) {
        issues.push({
          rule: 'R4-label-untranslated',
          path,
          message: `label "${node}" has no Chinese characters.`,
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
      if (typeof value === 'string' && LABEL_PATH_PATTERNS.some((re) => re.test(childPath))) {
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

  if (advanced) {
    let source;
    try {
      source = yaml.load(readFileSync(sourcePath, 'utf8'));
      issues.push(...lintAdvancedPair(source, parsed, strictEditor));
    } catch (err) {
      issues.push({ rule: 'SOURCE', path: '', message: `failed to load source file: ${err.message}` });
    }
  }

  return issues;
}

function lintFolder(folder) {
  const folderName = basename(folder);
  const fileIssues = new Map();
  let advanced = false;

  try {
    const sourceIdea = yaml.load(readFileSync(join(folder, 'idea.yaml'), 'utf8'));
    advanced = Number(sourceIdea?.qualityPolicyVersion || 1) >= 2;
  } catch {
    // Source parse errors are reported by the report validators.
  }

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
    const sourcePath = join(folder, fname.replace('.zh.yaml', '.yaml'));
    const issues = lintFile(path, signalTitles, sourcePath, advanced);
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

function lintPair(sourcePath, translatedPath, strictEditor = false) {
  const fileIssues = new Map();
  let signalTitles = new Set();
  if (basename(translatedPath) === 'idea.zh.yaml') {
    try {
      signalTitles = collectSignalTitles(yaml.load(readFileSync(translatedPath, 'utf8')));
    } catch {
      // Parse errors are reported by lintFile.
    }
  }

  let advanced = true;
  const ideaPath = join(dirname(sourcePath), 'idea.yaml');
  if (existsSync(ideaPath)) {
    try {
      const sourceIdea = yaml.load(readFileSync(ideaPath, 'utf8'));
      advanced = Number(sourceIdea?.qualityPolicyVersion || 1) >= 2;
    } catch {
      // Source parse errors are reported by the report validators.
    }
  }

  const issues = lintFile(translatedPath, signalTitles, sourcePath, advanced, strictEditor);
  if (issues.length > 0) fileIssues.set(basename(translatedPath), issues);
  return { folder: basename(dirname(translatedPath)), fileIssues };
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--pair') {
    const strictEditor = args[1] === '--strict-editor';
    if (args.length !== (strictEditor ? 4 : 3)) usage();
    const sourcePath = resolve(args[strictEditor ? 2 : 1]);
    const translatedPath = resolve(args[strictEditor ? 3 : 2]);
    for (const path of [sourcePath, translatedPath]) {
      if (!existsSync(path) || !statSync(path).isFile()) {
        console.error(`[check-zh-translations] not a file: ${path}`);
        process.exit(2);
      }
    }
    const totalIssues = reportFolderResult(lintPair(sourcePath, translatedPath, strictEditor));
    if (totalIssues === 0) {
      console.log(`[check-zh-translations] ✓ ${basename(translatedPath)} clean.`);
      process.exit(0);
    }
    console.log(`\n[check-zh-translations] ✗ ${totalIssues} issue(s) in ${basename(translatedPath)}.`);
    process.exit(1);
  }

  const arg = args[0];
  if (!arg || args.length !== 1) usage();
  const target = resolve(arg);
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    console.error(`[check-zh-translations] not a directory: ${target}`);
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
    console.log(`[check-zh-translations] ✓ ${scanned} folder(s) clean.`);
    process.exit(0);
  }
  console.log(`\n[check-zh-translations] ✗ ${totalIssues} issue(s) across ${scanned} folder(s).`);
  process.exit(1);
}

main();
