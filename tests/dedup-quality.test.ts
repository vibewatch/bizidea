import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'bizidea-dedup-'));
  const report = join(root, 'report');
  const index = join(root, '_index.yaml');
  tempDirs.push(root);
  return { report, index };
}

function run(report: string, index: string) {
  return spawnSync(process.execPath, ['scripts/deduplicate-idea.mjs', report, index], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('semantic idea deduplication', () => {
  it('rejects the same concept under a different title', () => {
    const { report, index } = makeFixture();
    mkdirSync(report);
    writeFileSync(join(report, 'idea.yaml'), `
slug: packet-release-readiness
sector: bio
pitch: Packet release workspace that lets lean biotech teams start IRB and site work before a complete IND filing.
problem: Small sponsors coordinate rolling IND work through spreadsheets and consultants.
targetUser:
  primary: Lean biotech regulatory operations teams.
startupThesis:
  beachhead: Venture-backed drug developers entering their first clinical program.
  wedge: Sponsor-QRI workspace for module readiness, release evidence, IRB dependencies, and site activation.
goToMarketSeed:
  firstCustomer: Lean biotech sponsors with one lead asset and an outsourced regulatory team.
  currentAlternative: CRO trackers, email, spreadsheets, and document repositories.
  switchingReason: Release-level dependencies unblock site startup earlier.
`);
    writeFileSync(index, `
entries:
  - runFolder: historical-rolling-ind
    slug: rolling-ind-work-packets
    sector: bio
    pitch: Work-packet system for biotech sponsors to run rolling IND review with QRIs and open phase 1 sites before full filing.
    beachhead: Emerging US biopharma teams coordinating first-in-human studies.
    wedge: Sponsor-QRI workspace for module readiness, release evidence, IRB dependencies, and site activation.
    targetUserPrimary: Lean biotech regulatory operations teams.
`);

    const result = run(report, index);
    expect(result.status).toBe(10);
    expect(result.stdout).toContain('concept-similarity');
  });
});
