import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];

function makeTriageFolder(yaml: string) {
  const folder = mkdtempSync(join(tmpdir(), 'bizidea-triage-'));
  tempDirs.push(folder);
  writeFileSync(join(folder, 'triage.yaml'), yaml);
  return folder;
}

function runValidate(folder: string) {
  return spawnSync(process.execPath, ['scripts/validate-stage.mjs', folder, 'triage'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

const validTriageYaml = `
triageSchemaVersion: 2
runDate: '2026-05-11'
topic: startup news
topicScope: broad
timeWindow: 2026-05-10 to 2026-05-10
timeWindowLabel: yesterday
cap: 5
historyIndexPath: /tmp/ideas/_index.yaml
historyEntriesConsidered: 0
candidatesFetched: 3
clustersFound: 1
selectedCount: 1
clusters:
  - clusterId: c1
    proposedTopic: AI workflow incident response
    proposedSlug: fixture-workflow-incident
    sectorHint: dev-tools
    headline: FixtureCo launched a workflow incident product after named customers reported escalation delays.
    primaryCompanies:
      - FixtureCo
    topSourceUrls:
      - https://example.com/fixture-workflow-incident
    sourceBriefs:
      - id: 1
        title: FixtureCo launches workflow incident product
        url: https://example.com/fixture-workflow-incident
        publisher: Example News
        publishedDate: '2026-05-10'
        company: FixtureCo
        eventType: launch
        fetchVerified: true
        keyPoints:
          - FixtureCo named customer escalation delays as the trigger for the launch.
    eventKeys:
      - fixtureco|launch|2026-05
    itemCount: 1
    startupRelevance: 4
    painIntensity: 4
    opportunityClarity: 4
    nonObviousness: 3
    qualityScore: 3.8
    signalStrength: 4
    evidenceConfidence: 3
    incumbentGravity: 2
    selectionScore: 3.4
    scoreRationale: Strong opportunity clarity, weakest non-obviousness; evidence is concrete but single-source.
    selectionRationale: Selected because the buyer pain and workflow wedge are explicit despite limited source depth.
    dedupeStatus: new
    dedupeRationale: No matching event key, slug, source URL, or high keyword overlap was found.
    selected: true
`;

afterEach(() => {
  for (const folder of tempDirs.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

describe('validate-stage triage v2', () => {
  it('accepts a valid weighted evidence triage file', () => {
    const folder = makeTriageFolder(validTriageYaml);
    const result = runValidate(folder);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('triage ok');
  });

  it('rejects triage files missing v2 scoring fields', () => {
    const folder = makeTriageFolder(validTriageYaml.replace('    evidenceConfidence: 3\n', ''));
    const result = runValidate(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('evidenceConfidence');
  });

  it('rejects selected clusters below the evidence threshold', () => {
    const folder = makeTriageFolder(validTriageYaml
      .replace('    evidenceConfidence: 3\n', '    evidenceConfidence: 1\n')
      .replace('    selectionScore: 3.4\n', '    selectionScore: 3.0\n'));
    const result = runValidate(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('selected requires evidenceConfidence >= 2');
  });

  it('rejects triage scores with more than one decimal place', () => {
    const folder = makeTriageFolder(validTriageYaml.replace('    qualityScore: 3.8\n', '    qualityScore: 3.81\n'));
    const result = runValidate(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('qualityScore must use at most one decimal place');
  });
});
