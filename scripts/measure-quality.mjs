#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { findTitleCliche } from './text.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const IDEAS_ROOT = join(ROOT, 'ideas');
const TRANSLATIONESE = [
  /对于.{0,18}而言/g,
  /对.{0,18}来说/g,
  /通过.{0,24}来/g,
  /在.{0,24}的过程中/g,
  /被设计为/g,
  /被认为是/g,
  /进行(?:验证|分析|评估|尝试|测试)/g,
  /形成(?:机制|优势|闭环)/g,
  /这意味着/g,
  /这表明/g,
];

function folders() {
  return readdirSync(IDEAS_ROOT)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .map((name) => join(IDEAS_ROOT, name))
    .filter((path) => statSync(path).isDirectory());
}

function walk(value, visit) {
  if (Array.isArray(value)) return value.forEach((item) => walk(item, visit));
  if (value && typeof value === 'object') return Object.values(value).forEach((item) => walk(item, visit));
  if (typeof value === 'string') visit(value);
}

const metrics = {
  reports: 0,
  currentPolicyReports: 0,
  currentPolicyTitleCliches: 0,
  currentPolicyTranslationeseHits: 0,
  currentPolicySourcesFetched: 0,
  currentPolicyEvidenceRetained: 0,
  currentPolicyUniquePublishers: 0,
  currentPolicySourceTypes: 0,
  titleClicheReports: 0,
  osSlugs: 0,
  translationeseHits: 0,
  researchFetchedTotal: 0,
  researchRetainedTotal: 0,
  researchReports: 0,
};

for (const folder of folders()) {
  const idea = yaml.load(readFileSync(join(folder, 'idea.yaml'), 'utf8'));
  const currentPolicy = Number(idea?.qualityPolicyVersion || 1) >= 2;
  metrics.reports += 1;
  if (currentPolicy) metrics.currentPolicyReports += 1;
  if (findTitleCliche(idea?.slug, idea?.pitch)) {
    metrics.titleClicheReports += 1;
    if (currentPolicy) metrics.currentPolicyTitleCliches += 1;
  }
  if (/(?:^|-)os(?:-|$)/i.test(String(idea?.slug || ''))) metrics.osSlugs += 1;

  const researchPath = join(folder, 'research.yaml');
  if (existsSync(researchPath)) {
    const research = yaml.load(readFileSync(researchPath, 'utf8'));
    metrics.researchReports += 1;
    metrics.researchFetchedTotal += Number(research?.researchCoverage?.sourcesFetched || 0);
    metrics.researchRetainedTotal += Array.isArray(research?.evidenceCorpus) ? research.evidenceCorpus.length : 0;
    if (currentPolicy) {
      metrics.currentPolicySourcesFetched += Number(research?.researchCoverage?.sourcesFetched || 0);
      metrics.currentPolicyEvidenceRetained += Array.isArray(research?.evidenceCorpus) ? research.evidenceCorpus.length : 0;
      metrics.currentPolicyUniquePublishers += Number(research?.researchCoverage?.uniquePublishers || 0);
      metrics.currentPolicySourceTypes += Number(research?.researchCoverage?.sourceTypeCount || 0);
    }
  }

  for (const name of readdirSync(folder).filter((file) => file.endsWith('.zh.yaml'))) {
    const translated = yaml.load(readFileSync(join(folder, name), 'utf8'));
    walk(translated, (text) => {
      for (const pattern of TRANSLATIONESE) {
        pattern.lastIndex = 0;
        const hits = (text.match(pattern) || []).length;
        metrics.translationeseHits += hits;
        if (currentPolicy) metrics.currentPolicyTranslationeseHits += hits;
      }
    });
  }
}

const average = (total, count) => count > 0 ? Number((total / count).toFixed(1)) : 0;
const output = {
  reports: metrics.reports,
  currentPolicyReports: metrics.currentPolicyReports,
  titleClicheReports: metrics.titleClicheReports,
  titleClichePct: average(metrics.titleClicheReports * 100, metrics.reports),
  osSlugs: metrics.osSlugs,
  translationeseHits: metrics.translationeseHits,
  averageSourcesFetched: average(metrics.researchFetchedTotal, metrics.researchReports),
  averageEvidenceRetained: average(metrics.researchRetainedTotal, metrics.researchReports),
  currentPolicy: {
    reports: metrics.currentPolicyReports,
    titleClicheReports: metrics.currentPolicyTitleCliches,
    translationeseHits: metrics.currentPolicyTranslationeseHits,
    averageSourcesFetched: average(metrics.currentPolicySourcesFetched, metrics.currentPolicyReports),
    averageEvidenceRetained: average(metrics.currentPolicyEvidenceRetained, metrics.currentPolicyReports),
    averageUniquePublishers: average(metrics.currentPolicyUniquePublishers, metrics.currentPolicyReports),
    averageSourceTypes: average(metrics.currentPolicySourceTypes, metrics.currentPolicyReports),
  },
};

console.log(yaml.dump(output, { noRefs: true, sortKeys: false }).trim());
