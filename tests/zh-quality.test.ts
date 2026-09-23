import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];

function makeFolder(pitch: string, topSourceUrl = 'https://example.com/source') {
  const folder = mkdtempSync(join(tmpdir(), 'bizidea-zh-'));
  tempDirs.push(folder);

  writeFileSync(join(folder, 'idea.yaml'), `
qualityPolicyVersion: 2
slug: review-cycle-wedge
pitch: A wedge for operations teams that cuts review time from 10 days to 2 days.
topSourceUrls:
  - https://example.com/source
`);
  writeFileSync(join(folder, 'idea.zh.yaml'), `
qualityPolicyVersion: 2
slug: review-cycle-wedge
pitch: ${pitch}
topSourceUrls:
  - ${topSourceUrl}
`);

  for (const name of ['research', 'business-plan', 'financial-model', 'index']) {
    writeFileSync(join(folder, `${name}.yaml`), `
slug: review-cycle-wedge
summary: Revenue reaches $2M with 70% gross margin.
`);
    writeFileSync(join(folder, `${name}.zh.yaml`), `
slug: review-cycle-wedge
summary: 收入达到 $2M，毛利率为 70%。
`);
  }

  return folder;
}

function run(folder: string) {
  return spawnSync(process.execPath, ['scripts/check-zh-translations.mjs', folder], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function runPair(folder: string, name = 'idea') {
  return spawnSync(process.execPath, [
    'scripts/check-zh-translations.mjs',
    '--pair',
    join(folder, `${name}.yaml`),
    join(folder, `${name}.zh.yaml`),
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const folder of tempDirs.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe('advanced Chinese translation quality checks', () => {
  it('accepts faithful, natural Chinese with preserved numbers', () => {
    const result = run(makeFolder('这道切口帮运营团队把审核周期从 10 天压到 2 天。'));
    expect(result.status).toBe(0);
  });

  it('rejects number drift and translation-flavored phrasing', () => {
    const result = run(makeFolder('通过这道切口来帮运营 团队把审核周期从 10 天压到 3 天。'));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('R7-number-drift');
    expect(result.stdout).toContain('R9-translationese');
    expect(result.stdout).toContain('R11-cjk-spacing');
  });

  it('rejects labels pasted into source URLs', () => {
    const result = run(makeFolder(
      '这道切口帮运营团队把审核周期从 10 天压到 2 天。',
      '来源 https://example.com/source',
    ));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('R6-value-drift');
  });

  it('rejects English month shorthand inside Chinese prose', () => {
    const result = run(makeFolder('这道切口帮运营团队把审核周期从 10m 压到 2m。'));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('R12-unit-style');
  });

  it('validates one translated artifact without waiting for the other pairs', () => {
    const folder = makeFolder('这道切口帮运营团队把审核周期从 10 天压到 2 天。');
    rmSync(join(folder, 'research.zh.yaml'));

    const result = runPair(folder);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('idea.zh.yaml clean');
  });
});
