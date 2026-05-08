import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import type { Loader } from 'astro/loaders';
import type { Lang } from '../lib/i18n';
import { stageFileSchemas, type StageFiles } from '../lib/stage-schemas';

// Resolve relative to the Astro project (website/) which is process.cwd() during build.
const IDEAS_DIR = resolve(process.cwd(), '..', 'ideas');
const REQUIRED_LOCALIZED_FILES = [
  'idea.zh.yaml',
  'research.zh.yaml',
  'business-plan.zh.yaml',
  'financial-model.zh.yaml',
  'index.zh.yaml',
];

export type LocalizedIndexData = Record<string, unknown>;

const parsedYamlCache = new Map<string, unknown>();
const localizedIndexCache = new Map<string, LocalizedIndexData | null>();
const stageFilesCache = new Map<string, StageFiles>();
const zhTranslationCache = new Map<string, boolean>();

function clearIdeaCaches(): void {
  parsedYamlCache.clear();
  localizedIndexCache.clear();
  stageFilesCache.clear();
  zhTranslationCache.clear();
}

/**
 * List all valid idea run folders.
 * Filters out hidden/system folders (., _) and non-directories.
 * Returns in reverse chronological order (newest first).
 */
function listRuns(): string[] {
  if (!existsSync(IDEAS_DIR)) return [];
  return readdirSync(IDEAS_DIR)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => {
      try {
        return statSync(join(IDEAS_DIR, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort()
    .reverse();
}

/**
 * Generate a short SHA-1 hash for disambiguation.
 * Used to create unique slugs when multiple runs have similar names.
 */
function shortHash(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 6);
}

/**
 * Recursively repair "colon-paste" YAML accidents: an unquoted scalar like
 * `- Some sentence: more text` is parsed by YAML as `{ "Some sentence": "more text" }`
 * instead of the intended string. We detect this by finding plain objects with
 * exactly one key whose key contains a space (real YAML keys never do) and
 * coerce them back to `"<key>: <value>"` strings.
 *
 * This is a workaround for agents that paste values with colons without quoting them.
 * The build-time quote-colons.mjs and expand-flow.mjs scripts handle most cases,
 * but this provides a safety net.
 *
 * @param value - Raw parsed YAML value (any type)
 * @returns - Repaired value with colon-paste fixed recursively
 */
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

function readYamlCached(path: string): unknown {
  if (parsedYamlCache.has(path)) return parsedYamlCache.get(path);

  const raw = readFileSync(path, 'utf8');
  const parsed = yaml.load(raw);
  const repaired = fixColonPaste(parsed);
  parsedYamlCache.set(path, repaired);
  return repaired;
}

/**
 * Parse run folder name to extract timestamp and generate slug.
 * Handles both new format (14-digit-timestamp-slug) and legacy (YYYY-MM-DD-slug).
 *
 * @param runId - Folder name
 * @returns Object with runTimestamp and folderSlug
 */
function parseRunId(runId: string): { runTimestamp: string; folderSlug: string } {
  const m = runId.match(/^(\d{14})-(.+)$/);
  if (m) return { runTimestamp: m[1]!, folderSlug: `${m[2]!}-${shortHash(runId)}` };
  // legacy fallback: <YYYY-MM-DD>-<slug>
  const m2 = runId.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (m2) return { runTimestamp: m2[1]!.replace(/-/g, '') + '000000', folderSlug: `${m2[2]!}-${shortHash(runId)}` };
  return { runTimestamp: '00000000000000', folderSlug: runId };
}

/**
 * Astro Content Collection Loader for ideas.
 * Loads all index.yaml files from ideas/<run>/ directories and validates them.
 * Reports warnings for missing/malformed files but continues building.
 */
export function ideasLoader(): Loader {
  return {
    name: 'bizidea-ideas-loader',
    load: async ({ store, parseData, logger }) => {
      store.clear();
      clearIdeaCaches();
      const runs = listRuns();

      if (runs.length === 0) {
        logger.info(`[ideas-loader] No idea runs found in ${IDEAS_DIR}`);
        return;
      }

      logger.info(`[ideas-loader] Loading ${runs.length} idea run(s) from ${IDEAS_DIR}`);

      let loaded = 0;
      let skipped = 0;

      for (const runId of runs) {
        const indexPath = join(IDEAS_DIR, runId, 'index.yaml');

        if (!existsSync(indexPath)) {
          logger.warn(`[ideas-loader] skipped ${runId}: missing index.yaml`);
          skipped++;
          continue;
        }

        try {
          let parsed: unknown;

          try {
            parsed = readYamlCached(indexPath);
          } catch (yamlErr) {
            logger.error(`[ideas-loader] ${runId}: YAML parsing failed — ${yamlErr instanceof Error ? yamlErr.message : String(yamlErr)}`);
            skipped++;
            continue;
          }

          const repaired = parsed as Record<string, unknown>;
          const { runTimestamp, folderSlug } = parseRunId(runId);

          try {
            const data = await parseData({
              id: runId,
              data: { ...repaired, runId, runTimestamp, folderSlug },
            });
            store.set({ id: runId, data });
            loaded++;
          } catch (validationErr) {
            logger.error(`[ideas-loader] ${runId}: Zod validation failed — ${validationErr instanceof Error ? validationErr.message : String(validationErr)}`);
            skipped++;
          }
        } catch (err) {
          logger.error(`[ideas-loader] ${runId}: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
          skipped++;
        }
      }

      logger.info(`[ideas-loader] ✓ loaded ${loaded}/${runs.length} run(s), skipped ${skipped}`);
    },
  };
}

/**
 * Read a YAML file with language fallback.
 * Tries localized version (e.g., idea.zh.yaml) first, then falls back to English (idea.yaml).
 *
 * @param folder - Path to the idea run folder
 * @param basename - Base filename without extension (e.g., "idea", "research")
 * @param lang - Language code ('en' or 'zh')
 * @returns - Parsed and repaired YAML content, or throws on read/parse error
 */
function readLocalizedYaml(folder: string, basename: string, lang: Lang): unknown {
  const localized = join(folder, `${basename}.${lang}.yaml`);
  const fallback = join(folder, `${basename}.yaml`);

  if (lang === 'zh' && existsSync(localized)) {
    try {
      return readYamlCached(localized);
    } catch (err) {
      throw new Error(`Failed to load ${localized}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    return readYamlCached(fallback);
  } catch (err) {
    throw new Error(`Failed to load ${fallback}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Check if a run has Chinese translation files.
 * Returns true only if all localized report artifacts exist.
 *
 * @param runId - The run folder name
 * @returns - true if zh translation exists, false otherwise
 */
export function hasZhTranslation(runId: string): boolean {
  if (zhTranslationCache.has(runId)) return zhTranslationCache.get(runId)!;

  const folder = join(IDEAS_DIR, runId);
  const exists = REQUIRED_LOCALIZED_FILES.every((file) => existsSync(join(folder, file)));
  zhTranslationCache.set(runId, exists);
  return exists;
}

/**
 * Load the index.yaml for a run with language support.
 * Tries localized version first (e.g., index.zh.yaml), then English (index.yaml).
 *
 * @param runId - The run folder name
 * @param lang - Language code ('en' or 'zh'), defaults to 'en'
 * @returns - Parsed index object, or null if no file found
 */
export function loadLocalizedIndex(runId: string, lang: Lang = 'en'): LocalizedIndexData | null {
  const cacheKey = `${runId}:${lang}`;
  if (localizedIndexCache.has(cacheKey)) return localizedIndexCache.get(cacheKey)!;

  const folder = join(IDEAS_DIR, runId);
  const localized = join(folder, `index.${lang}.yaml`);
  const fallback = join(folder, 'index.yaml');

  if (lang === 'zh' && existsSync(localized)) {
    try {
      const data = readYamlCached(localized) as LocalizedIndexData;
      localizedIndexCache.set(cacheKey, data);
      return data;
    } catch (err) {
      console.error(`[loadLocalizedIndex] ${runId}: failed to load zh — ${err instanceof Error ? err.message : String(err)}`);
      localizedIndexCache.set(cacheKey, null);
      return null;
    }
  }

  if (!existsSync(fallback)) {
    localizedIndexCache.set(cacheKey, null);
    return null;
  }

  try {
    const data = readYamlCached(fallback) as LocalizedIndexData;
    localizedIndexCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`[loadLocalizedIndex] ${runId}: failed to load en — ${err instanceof Error ? err.message : String(err)}`);
    localizedIndexCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Load all stage files (idea, research, business-plan, financial-model) for a run.
 * Supports language fallback (zh → en).
 * Throws on missing files; call functions above to pre-check existence if needed.
 *
 * @param runId - The run folder name
 * @param lang - Language code ('en' or 'zh'), defaults to 'en'
 * @returns - Object with all four stage files as parsed YAML
 * @throws - On file read or YAML parse errors
 */
export function loadStageFiles(runId: string, lang: Lang = 'en'): StageFiles {
  const cacheKey = `${runId}:${lang}`;
  const cached = stageFilesCache.get(cacheKey);
  if (cached) return cached;

  const folder = join(IDEAS_DIR, runId);
  const stages: StageFiles = {
    idea: stageFileSchemas.idea.parse(readLocalizedYaml(folder, 'idea', lang)),
    research: stageFileSchemas.research.parse(readLocalizedYaml(folder, 'research', lang)),
    businessPlan: stageFileSchemas.businessPlan.parse(readLocalizedYaml(folder, 'business-plan', lang)),
    financialModel: stageFileSchemas.financialModel.parse(readLocalizedYaml(folder, 'financial-model', lang)),
  };
  stageFilesCache.set(cacheKey, stages);
  return stages;
}
