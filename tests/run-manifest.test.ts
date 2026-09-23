import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const script = join(root, 'scripts', 'run-manifest.mjs');
const temporaryRoots: string[] = [];

function makeRunsRoot() {
  const path = mkdtempSync(join(tmpdir(), 'bizidea-runs-'));
  temporaryRoots.push(path);
  return path;
}

function run(runsRoot: string, ...args: string[]) {
  const ideasRoot = join(runsRoot, 'ideas');
  mkdirSync(ideasRoot, { recursive: true });
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    env: {
      ...process.env,
      BIZIDEA_RUNS_DIR: runsRoot,
      BIZIDEA_IDEAS_DIR: ideasRoot,
    },
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('run manifest', () => {
  test('records retries and completes atomically', () => {
    const runsRoot = makeRunsRoot();
    const timestamp = '20260923220000';

    expect(run(runsRoot, 'init', timestamp, 'broad', '1', 'last 7 days', 'startup news').status).toBe(0);
    expect(run(runsRoot, 'mark', timestamp, 'triage', 'triage', 'in_progress').status).toBe(0);
    expect(run(runsRoot, 'mark', timestamp, 'triage', 'triage', 'failed', 'first attempt failed').status).toBe(0);
    expect(run(runsRoot, 'mark', timestamp, 'triage', 'triage', 'in_progress').status).toBe(0);
    expect(run(runsRoot, 'mark', timestamp, 'triage', 'triage', 'passed').status).toBe(0);
    expect(run(runsRoot, 'assert-idle', timestamp).status).toBe(0);
    expect(run(runsRoot, 'assert-generation-complete', timestamp).status).toBe(0);
    expect(run(runsRoot, 'finish', timestamp, 'completed').status).toBe(0);
    expect(run(runsRoot, 'verify', timestamp).status).toBe(0);

    const manifest = JSON.parse(
      readFileSync(join(runsRoot, timestamp, 'manifest.json'), 'utf8'),
    );
    expect(manifest.status).toBe('completed');
    expect(manifest.targets.triage.stages.triage.attempts).toBe(2);
    expect(manifest.targets.triage.stages.triage.status).toBe('passed');
    expect(manifest.events.at(-1).status).toBe('completed');
  });

  test('refuses to complete while a stage is active', () => {
    const runsRoot = makeRunsRoot();
    const timestamp = '20260923220001';

    expect(run(runsRoot, 'init', timestamp, 'narrow', '2', 'yesterday', 'PFAS').status).toBe(0);
    expect(run(runsRoot, 'mark', timestamp, 'workflow', 'publish', 'in_progress').status).toBe(0);

    const result = run(runsRoot, 'finish', timestamp, 'completed');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('active stages');
    expect(run(runsRoot, 'assert-idle', timestamp).status).toBe(1);
  });

  test('keeps an existing run request immutable', () => {
    const runsRoot = makeRunsRoot();
    const timestamp = '20260923220002';

    expect(run(runsRoot, 'init', timestamp, 'broad', '1', 'yesterday', 'startup news').status).toBe(0);
    expect(run(runsRoot, 'init', timestamp, 'broad', '1', 'yesterday', 'startup news').status).toBe(0);

    const result = run(runsRoot, 'init', timestamp, 'broad', '2', 'yesterday', 'startup news');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not match');
  });

  test('requires every current-run report stage before bundling', () => {
    const runsRoot = makeRunsRoot();
    const timestamp = '20260923220003';
    const folder = `${timestamp}-pfas-duty-release`;
    mkdirSync(join(runsRoot, 'ideas', folder), { recursive: true });

    expect(run(runsRoot, 'init', timestamp, 'narrow', '1', 'last 7 days', 'PFAS').status).toBe(0);
    expect(run(runsRoot, 'mark', timestamp, 'triage', 'triage', 'passed').status).toBe(0);
    expect(run(runsRoot, 'mark', timestamp, folder, 'idea', 'passed').status).toBe(0);

    const result = run(runsRoot, 'assert-generation-complete', timestamp);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${folder}/dedupe=missing`);
    expect(result.stderr).toContain(`${folder}/zh-index=missing`);
  });
});
