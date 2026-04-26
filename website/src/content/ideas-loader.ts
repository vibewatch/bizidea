import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import type { Loader } from 'astro/loaders';

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
        const parsed = yaml.load(raw) as Record<string, unknown>;
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
  news: unknown;
  idea: unknown;
  research: unknown;
  businessPlan: unknown;
  financialModel: unknown;
}

export function loadStageFiles(runId: string): StageFiles {
  const folder = join(IDEAS_DIR, runId);
  const read = (name: string) => yaml.load(readFileSync(join(folder, name), 'utf8'));
  return {
    news: read('news.yaml'),
    idea: read('idea.yaml'),
    research: read('research.yaml'),
    businessPlan: read('business-plan.yaml'),
    financialModel: read('financial-model.yaml'),
  };
}
