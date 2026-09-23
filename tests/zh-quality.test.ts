import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function runStrictPair(folder: string, name = 'idea') {
  return spawnSync(process.execPath, [
    'scripts/check-zh-translations.mjs',
    '--pair',
    '--strict-editor',
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

  it('strict editor mode rejects semantic compression, dropped terms, qualifiers, and duplicate prose', () => {
    const folder = mkdtempSync(join(tmpdir(), 'bizidea-zh-strict-'));
    tempDirs.push(folder);
    writeFileSync(join(folder, 'idea.yaml'), `
qualityPolicyVersion: 2
slug: strict-editor-check
summaryA: Deltek estimates that at least 20 federal contractors still use Excel and shared drives for compliance handoffs, so the workflow is not yet software-native.
summaryB: Market evidence shows that proposal operations, contracts, and compliance budgets fund the work rather than a net-new software category with a dedicated line item.
summaryC: Distinct workflow evidence explains which users own the handoff, why the process fails today, and which operational mechanism creates a defensible software opportunity.
`);
    writeFileSync(join(folder, 'idea.zh.yaml'), `
qualityPolicyVersion: 2
slug: strict-editor-check
summaryA: 证据显示市场已经形成明确需求，关键数字包括 20，值得持续关注。
summaryB: 证据显示市场已经形成明确需求，关键数字包括 20，值得持续关注。
summaryC: 市场值得关注。
`);

    const result = runStrictPair(folder);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('R13-protected-term-drift');
    expect(result.stdout).toContain('R14-undertranslation');
    expect(result.stdout).toContain('R15-duplicate-collapse');
    expect(result.stdout).toContain('R16-qualifier-drift');
    expect(result.stdout).toContain('R9-translationese');
  });

  it('strict editor mode accepts faithful source-anchored Chinese', () => {
    const folder = mkdtempSync(join(tmpdir(), 'bizidea-zh-strict-'));
    tempDirs.push(folder);
    writeFileSync(join(folder, 'idea.yaml'), `
qualityPolicyVersion: 2
slug: strict-editor-clean
summaryA: Deltek estimates that at least 20 federal contractors still use Excel and shared drives for compliance handoffs, so the workflow is not yet software-native.
summaryB: Market evidence shows that proposal operations, contracts, and compliance budgets fund the work rather than a net-new software category with a dedicated line item.
deadline: The plan only reaches 7 paying systems by Q4Y3.
`);
    writeFileSync(join(folder, 'idea.zh.yaml'), `
qualityPolicyVersion: 2
slug: strict-editor-clean
summaryA: Deltek 估算，至少 20 家联邦承包商仍用 Excel 和共享盘交接合规工作，因此这套流程尚未完全软件化。
summaryB: 市场证据显示，这项工作由提案运营、合同和合规预算买单，并没有单列成全新的软件预算科目。
deadline: 到 Q4Y3 时，计划仍只有 7 个付费系统。
`);

    const result = runStrictPair(folder);
    expect(result.status).toBe(0);
  });

  it('strict editor mode rejects metric, scope, intensity, polarity, and deadline drift', () => {
    const folder = mkdtempSync(join(tmpdir(), 'bizidea-zh-strict-'));
    tempDirs.push(folder);
    writeFileSync(join(folder, 'idea.yaml'), `
qualityPolicyVersion: 2
slug: strict-predicate-check
mappingMetric: 80% reviewer-approved historical impact mapping accuracy on at least 2 accounts.
budgetEvidence: Deltek says bid and proposal costs rose from 14% to 19%.
onboarding: Founder-led selling continues alongside workflow-heavy onboarding.
tradeoff: 'The core tradeoff is explicit: services remain necessary until mappings are standardized.'
thesis: Manual review is still required, weakening the claim that the wedge is immediately software-native.
validationWindow: Confirm that at least 4 of 5 accounts can achieve 80% reviewer-approved historical impact mapping accuracy within 3 weeks of onboarding.
mappingCoverage: Confirm that at least 4 accounts can reach 80% reviewer-approved mapping within 3 weeks of onboarding.
killCriterion: The first 3 pilots fail to reach at least 80% mapping accuracy.
upside: The first deployment shortens procurement, an eighth system lands by Q4Y3, and second-service-line expansion arrives earlier.
deadline: The plan only reaches 7 paying systems by Q4Y3.
`);
    writeFileSync(join(folder, 'idea.zh.yaml'), `
qualityPolicyVersion: 2
slug: strict-predicate-check
mappingMetric: 历史影响映射达到 80% 审核认可率，覆盖至少 2 家客户。
budgetEvidence: Deltek 称投标成本从 14% 升至 19%。
onboarding: 创始人继续主导销售，客户导入依赖工作流交付。
tradeoff: 服务仍不可或缺。 映射实现标准化后才能收缩服务。
thesis: 仍需人工审核，因此软件原生切口的反对意见并不成立。
validationWindow: 确认至少 4 家（共 5 家）的经审核认可映射准确率达到 80% 以上，并在客户入驻启动后 3 周内做到。
mappingCoverage: 确认至少 4 家的映射达到 80% 审核认可率，并在上线 3 周内做到。
killCriterion: 前 3 个试点的映射准确率未达到至少 80%。
upside: 首个部署缩短采购周期，Q4Y3 前再签一个系统，第二条服务线也提前上线。
deadline: 计划达到 7 个付费系统，时间为 Q4Y3。
`);

    const result = runStrictPair(folder);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('R17-key-predicate-drift');
    expect(result.stdout).toContain('accuracy metric');
    expect(result.stdout).toContain('reviewer-approved mapping predicate');
    expect(result.stdout).toContain('reviewer-approved mapping metric');
    expect(result.stdout).toContain('bid-and-proposal cost scope');
    expect(result.stdout).toContain('percentage cost metric');
    expect(result.stdout).toContain('workflow-heavy intensity');
    expect(result.stdout).toContain('explicit core tradeoff');
    expect(result.stdout).toContain('claim-weakening polarity');
    expect(result.stdout).toContain('exact 80% mapping threshold');
    expect(result.stdout).toContain('onboarding clock');
    expect(result.stdout).toContain('eighth-system deadline attachment');
    expect(result.stdout).toContain('service-line expansion predicate');
    expect(result.stdout).toContain('seven-system deadline attachment');
    expect(result.stdout).toContain('R16-qualifier-drift');
    expect(result.stdout).toContain('source qualifier "only"');
    expect(result.stdout).toContain('source qualifier "deadline by"');
    expect(result.stdout).toContain('R11-cjk-spacing');
    expect(result.stdout).toContain('R9-translationese');
  });

  it('restores the validated draft when an editorial pass becomes invalid', () => {
    const folder = makeFolder('这道切口帮运营团队把审核周期从 10 天压到 2 天。');
    const source = join(folder, 'idea.yaml');
    const target = join(folder, 'idea.zh.yaml');
    const original = readFileSync(target, 'utf8');

    const saved = spawnSync(process.execPath, [
      'scripts/zh-translation-checkpoint.mjs',
      'save',
      source,
      target,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(saved.status).toBe(0);
    expect(existsSync(`${target}.validated-draft`)).toBe(true);

    writeFileSync(target, original.replace('2 天', '3 天'));
    const restored = spawnSync(process.execPath, [
      'scripts/zh-translation-checkpoint.mjs',
      'restore',
      source,
      target,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(restored.status).toBe(0);
    expect(readFileSync(target, 'utf8')).toBe(original);
    expect(existsSync(`${target}.validated-draft`)).toBe(false);
  });
});
