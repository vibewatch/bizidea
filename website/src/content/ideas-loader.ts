import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import type { Loader } from 'astro/loaders';
import type { Lang } from '../lib/i18n';

// Resolve relative to the Astro project (website/) which is process.cwd() during build.
const IDEAS_DIR = resolve(process.cwd(), '..', 'ideas');

function listRuns(): string[] {
  if (!existsSync(IDEAS_DIR)) return [];
  return readdirSync(IDEAS_DIR)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => statSync(join(IDEAS_DIR, name)).isDirectory())
    .sort()
    .reverse();
}

function shortHash(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 6);
}

// Recursively repair "colon-paste" YAML accidents: an unquoted scalar like
// `- Some sentence: more text` is parsed by YAML as `{ "Some sentence": "more text" }`
// instead of the intended string. We detect this by finding plain objects with
// exactly one key whose key contains a space (real YAML keys never do) and
// coerce them back to `"<key>: <value>"` strings.
function fixColonPaste(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fixColonPaste);
  if (value && typeof value === 'object') {
    // Skip non-plain objects (Date, etc.) so we don't strip their internals.
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 1 && /\s/.test(keys[0]!)) {
      const k = keys[0]!;
      const v = (value as Record<string, unknown>)[k];
      if (typeof v === 'string') return `${k}: ${v}`;
      if (v == null) return k;
    }
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = fixColonPaste((value as Record<string, unknown>)[k]);
    return out;
  }
  return value;
}

function parseRunId(runId: string): { runTimestamp: string; folderSlug: string } {
  const m = runId.match(/^(\d{14})-(.+)$/);
  if (m) return { runTimestamp: m[1]!, folderSlug: `${m[2]!}-${shortHash(runId)}` };
  // legacy fallback: <YYYY-MM-DD>-<slug>
  const m2 = runId.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (m2) return { runTimestamp: m2[1]!.replace(/-/g, '') + '000000', folderSlug: `${m2[2]!}-${shortHash(runId)}` };
  return { runTimestamp: '00000000000000', folderSlug: runId };
}

export function ideasLoader(): Loader {
  return {
    name: 'bizidea-ideas-loader',
    load: async ({ store, parseData, logger }) => {
      store.clear();
      const runs = listRuns();
      logger.info(`Loading ${runs.length} idea run(s) from ${IDEAS_DIR}`);
      for (const runId of runs) {
        const indexPath = join(IDEAS_DIR, runId, 'index.yaml');
        if (!existsSync(indexPath)) {
          logger.warn(`skip ${runId}: missing index.yaml`);
          continue;
        }
        const raw = readFileSync(indexPath, 'utf8');
        const parsed = fixColonPaste(yaml.load(raw)) as Record<string, unknown>;
        const { runTimestamp, folderSlug } = parseRunId(runId);
        const data = await parseData({
          id: runId,
          data: { ...parsed, runId, runTimestamp, folderSlug },
        });
        store.set({ id: runId, data });
      }
    },
  };
}

export interface StageFiles {
  idea: unknown;
  research: unknown;
  businessPlan: unknown;
  financialModel: unknown;
}

function readLocalizedYaml(folder: string, basename: string, lang: Lang): unknown {
  const localized = join(folder, `${basename}.${lang}.yaml`);
  const fallback = join(folder, `${basename}.yaml`);
  if (lang === 'zh' && existsSync(localized)) {
    return fixColonPaste(yaml.load(readFileSync(localized, 'utf8')));
  }
  return fixColonPaste(yaml.load(readFileSync(fallback, 'utf8')));
}

export function hasZhTranslation(runId: string): boolean {
  const folder = join(IDEAS_DIR, runId);
  return existsSync(join(folder, 'idea.zh.yaml'));
}

export function loadLocalizedIndex(runId: string, lang: Lang = 'en'): Record<string, unknown> | null {
  const folder = join(IDEAS_DIR, runId);
  const localized = join(folder, `index.${lang}.yaml`);
  const fallback = join(folder, 'index.yaml');
  if (lang === 'zh' && existsSync(localized)) {
    return fixColonPaste(yaml.load(readFileSync(localized, 'utf8'))) as Record<string, unknown>;
  }
  if (!existsSync(fallback)) return null;
  return fixColonPaste(yaml.load(readFileSync(fallback, 'utf8'))) as Record<string, unknown>;
}

export function loadStageFiles(runId: string, lang: Lang = 'en'): StageFiles {
  const folder = join(IDEAS_DIR, runId);
  return {
    idea: readLocalizedYaml(folder, 'idea', lang),
    research: readLocalizedYaml(folder, 'research', lang),
    businessPlan: readLocalizedYaml(folder, 'business-plan', lang),
    financialModel: readLocalizedYaml(folder, 'financial-model', lang),
  };
}
