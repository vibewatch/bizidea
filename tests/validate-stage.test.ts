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

function makeResearchFolder(sourceBudgetMax: number, searchedQueries: unknown[] = ['fixture market query']) {
  const folder = mkdtempSync(join(tmpdir(), 'bizidea-research-'));
  tempDirs.push(folder);
  const sourceTypes = [
    'primary-company',
    'regulatory-government',
    'trade-press',
    'customer-community',
  ];
  const evidenceCorpus = Array.from({ length: 18 }, (_, index) => ({
    id: index + 1,
    publisher: `Publisher ${index + 1}`,
    title: `Evidence ${index + 1}`,
    date: '2026-05-11',
    url: `https://example.com/evidence-${index + 1}`,
    sourceType: sourceTypes[index % sourceTypes.length],
    topicBucket: 'validation',
    geography: 'North America',
    reputationTier: 'high',
    isPrimary: index < 3,
    fetchVerified: true,
    usedInMemo: index < 12,
    oneLineRelevance: 'Decision-useful evidence.',
  }));
  const research = {
    researchPolicyVersion: 3,
    slug: 'fixture-ai-workflow',
    date: '2026-05-11',
    researchCoverage: {
      sourceBudgetMin: 24,
      sourceBudgetMax,
      sourcesFound: 24,
      sourcesFetched: 24,
      sourcesRetained: 18,
      duplicatesRemoved: 0,
      memoSourcesUsed: 12,
      uniquePublishers: 18,
      sourceTypeCount: 4,
      primarySourceCount: 3,
      independentSourceCount: 15,
      searchedQueries,
      saturationReached: true,
      coverageGap: null,
    },
    deduplication: {},
    reportMemo: {
      incumbentThesis: [{ incumbentClass: 'Workflow tools', point: 'They do not own the wedge.', sourceRefs: [1] }],
    },
    market: {},
    competitors: [{ name: 'Fixture incumbent' }],
    evidenceCorpus,
    sources: evidenceCorpus.slice(0, 12).map(({ id, publisher, title, date, url }) => ({
      id, publisher, title, date, url,
    })),
  };
  writeFileSync(join(folder, 'research.yaml'), JSON.stringify(research));
  return folder;
}

const validTriageYaml = `
triageSchemaVersion: 3
runDate: '2026-05-11'
topic: startup news
topicScope: broad
timeWindow: 2026-05-10 to 2026-05-10
timeWindowLabel: yesterday
cap: 5
historyIndexPath: /tmp/ideas/_index.yaml
historyEntriesConsidered: 0
searchStrategy:
  provider: native-web-search
  queriesRun: 8
  candidatesFound: 20
  candidatesFetched: 12
  uniquePublishers: 9
  sourceTypesCovered: [primary-company, tier-one-news, trade-press]
  regionsCovered: [North America, Europe]
  saturationReached: true
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
        publisher: FixtureCo
        publishedDate: '2026-05-10'
        company: FixtureCo
        eventType: launch
        sourceType: primary-company
        geography: North America
        isPrimary: true
        fetchVerified: true
        keyPoints:
          - FixtureCo named customer escalation delays as the trigger for the launch.
      - id: 2
        title: Independent analysis of the workflow launch
        url: https://news.example.com/fixture-workflow-incident
        publisher: Example News
        publishedDate: '2026-05-10'
        company: FixtureCo
        eventType: launch
        sourceType: tier-one-news
        geography: North America
        isPrimary: false
        fetchVerified: true
        keyPoints:
          - Named buyers described escalation delays.
      - id: 3
        title: Trade review of workflow incident response
        url: https://trade.example.com/fixture-workflow-incident
        publisher: Trade Journal
        publishedDate: '2026-05-10'
        company: FixtureCo
        eventType: launch
        sourceType: trade-press
        geography: Europe
        isPrimary: false
        fetchVerified: true
        keyPoints:
          - The launch targets a specific operational bottleneck.
      - id: 4
        title: Customer workflow discussion
        url: https://community.example.com/fixture-workflow-incident
        publisher: Buyer Community
        publishedDate: '2026-05-10'
        company: FixtureCo
        eventType: news
        sourceType: customer-community
        geography: Europe
        isPrimary: false
        fetchVerified: true
        keyPoints:
          - Buyers described the current manual workaround.
    eventKeys:
      - fixtureco|launch|2026-05
    itemCount: 4
    painIntensity: 4
    opportunityClarity: 4
    creativePotential: 5
    venturePotential: 4
    whiteSpacePotential: 4
    evidenceConfidence: 3
    incumbentGravity: 2
    championDimension: creativePotential
    championScore: 5
    frontierStatus: non-dominated
    sourceDiversity:
      uniquePublishers: 4
      sourceTypeCount: 4
      primarySourceCount: 1
      independentSourceCount: 3
      geographyCount: 2
      maxPublisherSharePct: 25
      diversityGap: null
    scoreRationale: Creativity is exceptional, while venture scale and white space remain strong.
    selectionRationale: Selected as the cohort creativity champion with strong buyer pain and diverse evidence.
    dedupeStatus: new
    dedupeRationale: No matching event key, slug, source URL, or high keyword overlap was found.
    selected: true
`;

afterEach(() => {
  for (const folder of tempDirs.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

describe('validate-stage triage v3', () => {
  it('accepts a valid champion-based triage file', () => {
    const folder = makeTriageFolder(validTriageYaml);
    const result = runValidate(folder);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('triage ok');
  });

  it('rejects triage files missing champion scoring fields', () => {
    const folder = makeTriageFolder(validTriageYaml.replace('    evidenceConfidence: 3\n', ''));
    const result = runValidate(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('evidenceConfidence');
  });

  it('rejects selected clusters below the evidence threshold', () => {
    const folder = makeTriageFolder(validTriageYaml
      .replace('    evidenceConfidence: 3\n', '    evidenceConfidence: 2\n'));
    const result = runValidate(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('selected requires evidenceConfidence >= 3');
  });

  it('rejects selected clusters without an absolute champion score', () => {
    const folder = makeTriageFolder(validTriageYaml
      .replace('    creativePotential: 5\n', '    creativePotential: 4\n')
      .replace('    championScore: 5\n', '    championScore: 4\n'));
    const result = runValidate(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('selected requires championScore: 5');
  });

  it('enforces bounded search work for triage v4', () => {
    const folder = makeTriageFolder(validTriageYaml
      .replace('triageSchemaVersion: 3', 'triageSchemaVersion: 4')
      .replace('  queriesRun: 8', '  queriesRun: 17'));
    const result = runValidate(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('queriesRun must not exceed 16');
  });
});

describe('validate-stage research v3', () => {
  it('accepts the bounded 24-36 page budget', () => {
    const folder = makeResearchFolder(36);
    const result = spawnSync(process.execPath, ['scripts/validate-stage.mjs', folder, 'research'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('research ok');
  });

  it('rejects a research budget above 36 pages', () => {
    const folder = makeResearchFolder(40);
    const result = spawnSync(process.execPath, ['scripts/validate-stage.mjs', folder, 'research'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('sourceBudgetMax must be between sourceBudgetMin and 36');
  });

  it('rejects colon-paste mappings in searchedQueries', () => {
    const folder = makeResearchFolder(36, [{ 'Find market inputs': 'mid-market buyers' }]);
    const result = spawnSync(process.execPath, ['scripts/validate-stage.mjs', folder, 'research'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('searchedQueries must be a non-empty list of strings');
  });
});
