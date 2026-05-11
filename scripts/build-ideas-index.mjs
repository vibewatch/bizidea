#!/usr/bin/env node
// Walk ideas/<run>/{index,idea}.yaml and write ideas/_index.yaml — the
// aggregated history catalog used by News Triage to deduplicate across runs.
//
// Run from the repo root or any cwd; resolves the ideas/ folder relative to
// this script. Pure read of source YAMLs + write of one summary file. Safe to
// re-run after every pipeline run.

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { STOPWORDS } from './text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const IDEAS_DIR = resolve(REPO_ROOT, 'ideas');
const OUT_PATH = join(IDEAS_DIR, '_index.yaml');
const ARGS = new Set(process.argv.slice(2));
const STRICT = ARGS.has('--strict');
const CHECK_ONLY = ARGS.has('--check');

function canonicalUrl(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    // strip common tracking params
    const drop = [];
    for (const k of u.searchParams.keys()) {
      if (/^utm_|^ref$|^ref_|^mc_|^fbclid$|^gclid$/i.test(k)) drop.push(k);
    }
    drop.forEach((k) => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    // trim trailing slash on path (but keep root /)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch {
    return null;
  }
}

function keywords(text, max = 12) {
  if (!text) return [];
  const tokens = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  const seen = new Set();
  const out = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function ymOf(date) {
  if (!date) return null;
  const s = date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function eventKeysFrom(context, fallbackDate) {
  const keys = new Set();
  const sources = Array.isArray(context?.sources) ? context.sources : [];
  for (const s of sources.slice(0, 30)) {
    const company = (s.company || s.publisher || '').toString().toLowerCase().trim();
    const ym = ymOf(s.publishedDate) || ymOf(fallbackDate);
    const type = inferEventType(s);
    if (company && ym) keys.add(`${company}|${type}|${ym}`);
  }
  return [...keys].slice(0, 40);
}

function inferEventType(src) {
  const text = `${src.title || ''} ${(src.keyPoints || []).join(' ')}`.toLowerCase();
  if (/\bseries\s+[a-d]\b|\braises?\b|\bfunding\b|\bseed\b|\bpre-?seed\b/.test(text)) return 'funding';
  if (/\blaunch(es|ed)?\b|\bunveils?\b|\bannounces?\b/.test(text)) return 'launch';
  if (/\bacqui(res|sition|red)\b|\bmerges?\b|\bmerger\b/.test(text)) return 'mna';
  if (/\bregulation|\bbill\b|\blaw\b|\brule\b|\bpolicy\b/.test(text)) return 'regulation';
  if (/\bbreach\b|\boutage\b|\blawsuit\b|\bincident\b/.test(text)) return 'incident';
  return 'news';
}

function topCompanies(context) {
  const counts = new Map();
  for (const s of (context?.sources || []).slice(0, 50)) {
    const c = (s.company || '').toString().trim();
    if (!c) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([c]) => c);
}

function topSourceUrls(context, max = 20) {
  const out = [];
  const seen = new Set();
  for (const s of (context?.sources || [])) {
    const u = canonicalUrl(s.url);
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= max) break;
  }
  return out;
}

function safeLoad(path, errors) {
  if (!existsSync(path)) {
    errors.push(`missing ${path}`);
    return null;
  }
  try {
    return yaml.load(readFileSync(path, 'utf8'));
  } catch (err) {
    errors.push(`failed to parse ${path}: ${err.message}`);
    return null;
  }
}

function listRuns() {
  if (!existsSync(IDEAS_DIR)) return [];
  return readdirSync(IDEAS_DIR)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => {
      try { return statSync(join(IDEAS_DIR, name)).isDirectory(); }
      catch { return false; }
    })
    .sort();
}

function dateString(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v == null ? null : String(v);
}

function comparableIndex(index) {
  return {
    schemaVersion: index?.schemaVersion ?? null,
    entryCount: index?.entryCount ?? null,
    entries: Array.isArray(index?.entries) ? index.entries : [],
  };
}

function build() {
  const runs = listRuns();
  const entries = [];
  const errors = [];
  for (const runFolder of runs) {
    const dir = join(IDEAS_DIR, runFolder);
    const index = safeLoad(join(dir, 'index.yaml'), errors);
    if (!index) continue;
    const idea = safeLoad(join(dir, 'idea.yaml'), errors) || {};
    const sourceContext = idea?.sourceContext || {};
    const date = dateString(index.date || idea.date);
    const pitch = String(index.pitch || idea.pitch || '');
    const beachhead = String(idea?.startupThesis?.beachhead || '');
    const targetUserPrimary = String(idea?.targetUser?.primary || '');
    const sector = String(index.sector || idea.sector || '');
    entries.push({
      runFolder,
      slug: String(index.slug || idea.slug || ''),
      date,
      sector,
      pitch,
      beachhead,
      targetUserPrimary,
      topCompanies: topCompanies(sourceContext),
      topSourceUrls: topSourceUrls(sourceContext),
      eventKeys: eventKeysFrom(sourceContext, date),
      keywords: keywords(`${pitch} ${beachhead} ${targetUserPrimary}`, 16),
    });
  }
  const out = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    entryCount: entries.length,
    entries,
  };
  const dumped = yaml.dump(out, { lineWidth: 120, noRefs: true, sortKeys: false });
  try {
    yaml.load(dumped);
  } catch (err) {
    errors.push(`generated _index.yaml failed validation: ${err.message}`);
  }

  if (errors.length) {
    for (const err of errors) console.warn(`[build-ideas-index] ${err}`);
    if (STRICT) {
      console.error(`[build-ideas-index] strict mode failed with ${errors.length} issue(s)`);
      process.exit(1);
    }
  }

  if (CHECK_ONLY) {
    const currentErrors = [];
    const current = safeLoad(OUT_PATH, currentErrors);
    if (currentErrors.length) {
      for (const err of currentErrors) console.error(`[build-ideas-index] ${err}`);
      process.exit(1);
    }

    if (JSON.stringify(comparableIndex(current)) !== JSON.stringify(comparableIndex(out))) {
      console.error(`[build-ideas-index] check failed: ${OUT_PATH} is stale; run npm run build:ideas-index`);
      process.exit(1);
    }

    console.log(`[build-ideas-index] ✓ validated ${entries.length}/${runs.length} entries; checked ${OUT_PATH}; no files written`);
    return;
  }

  writeFileSync(OUT_PATH, dumped, 'utf8');
  console.log(`[build-ideas-index] wrote ${OUT_PATH} with ${entries.length} entries`);
}

build();
