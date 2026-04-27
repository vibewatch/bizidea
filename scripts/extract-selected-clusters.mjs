#!/usr/bin/env node
// Read a triage.yaml file and emit a compact JSON array suitable for a
// GitHub Actions matrix. Only selected, new clusters are included.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

function usage() {
  console.error('Usage: node scripts/extract-selected-clusters.mjs <path/to/triage.yaml>');
  process.exit(2);
}

const triagePath = process.argv[2] ? resolve(process.argv[2]) : null;
if (!triagePath) usage();
if (!existsSync(triagePath)) {
  console.error(`[extract-selected-clusters] not found: ${triagePath}`);
  process.exit(1);
}

let triage;
try {
  triage = yaml.load(readFileSync(triagePath, 'utf8'));
} catch (err) {
  console.error(`[extract-selected-clusters] failed to parse YAML: ${err.message}`);
  process.exit(1);
}

const clusters = Array.isArray(triage?.clusters) ? triage.clusters : [];
const selected = clusters
  .filter((cluster) => cluster?.selected === true && cluster?.dedupeStatus === 'new')
  .map((cluster) => ({
    clusterId: String(cluster.clusterId || ''),
    proposedSlug: String(cluster.proposedSlug || ''),
    proposedTopic: String(cluster.proposedTopic || cluster.headline || ''),
    sectorHint: String(cluster.sectorHint || 'other'),
    signalStrength: Number(cluster.signalStrength || 0),
  }))
  .filter((cluster) => cluster.clusterId && cluster.proposedSlug);

process.stdout.write(JSON.stringify(selected));