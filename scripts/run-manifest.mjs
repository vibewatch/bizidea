#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const RUNS_ROOT = resolve(process.env.BIZIDEA_RUNS_DIR || join(REPO_ROOT, '.bizidea-runs'));
const IDEAS_ROOT = resolve(process.env.BIZIDEA_IDEAS_DIR || join(REPO_ROOT, 'ideas'));
const MANIFEST_VERSION = 1;
const RUN_STATUSES = new Set(['running', 'completed', 'failed', 'no-output']);
const STAGE_STATUSES = new Set(['pending', 'in_progress', 'passed', 'failed', 'skipped']);
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const REQUIRED_REPORT_STAGES = [
  'idea',
  'dedupe',
  'research',
  'business-plan',
  'financial-model',
  'index',
  'zh-idea',
  'zh-research',
  'zh-business-plan',
  'zh-financial-model',
  'zh-index',
];

function usage() {
  console.error(`Usage:
  node scripts/run-manifest.mjs init <runTimestamp> <topicScope> <cap> <timeWindow> <topic>
  node scripts/run-manifest.mjs mark <runTimestamp> <target> <stage> <status> [message]
  node scripts/run-manifest.mjs finish <runTimestamp> <completed|failed|no-output> [message]
  node scripts/run-manifest.mjs verify [runTimestamp]
  node scripts/run-manifest.mjs assert-idle <runTimestamp>
  node scripts/run-manifest.mjs assert-generation-complete <runTimestamp>
  node scripts/run-manifest.mjs show <runTimestamp>`);
  process.exit(2);
}

function fail(message) {
  console.error(`[run-manifest] ${message}`);
  process.exit(1);
}

function now() {
  return new Date().toISOString();
}

function assertRunTimestamp(value) {
  if (!/^\d{14}$/.test(value || '')) fail(`invalid run timestamp: ${JSON.stringify(value)}`);
}

function assertSafeName(value, label) {
  if (!SAFE_NAME.test(value || '')) fail(`invalid ${label}: ${JSON.stringify(value)}`);
}

function manifestPath(runTimestamp) {
  assertRunTimestamp(runTimestamp);
  return join(RUNS_ROOT, runTimestamp, 'manifest.json');
}

function readManifest(runTimestamp) {
  const path = manifestPath(runTimestamp);
  if (!existsSync(path)) fail(`manifest does not exist: ${path}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`cannot parse ${path}: ${error.message}`);
  }
  validateManifest(manifest, path);
  return { manifest, path };
}

function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function validateManifest(manifest, path = 'manifest') {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    errors.push('must be an object');
  } else {
    if (manifest.manifestVersion !== MANIFEST_VERSION) {
      errors.push(`manifestVersion must be ${MANIFEST_VERSION}`);
    }
    if (!/^\d{14}$/.test(manifest.runTimestamp || '')) {
      errors.push('runTimestamp must be a 14-digit UTC timestamp');
    }
    if (!RUN_STATUSES.has(manifest.status)) {
      errors.push(`status must be one of ${[...RUN_STATUSES].join(', ')}`);
    }
    if (!manifest.request || typeof manifest.request !== 'object') {
      errors.push('request must be an object');
    }
    if (!manifest.targets || typeof manifest.targets !== 'object' || Array.isArray(manifest.targets)) {
      errors.push('targets must be an object');
    } else {
      for (const [targetName, target] of Object.entries(manifest.targets)) {
        if (!SAFE_NAME.test(targetName)) errors.push(`invalid target name ${JSON.stringify(targetName)}`);
        if (!target || typeof target !== 'object' || Array.isArray(target)) {
          errors.push(`target ${targetName} must be an object`);
          continue;
        }
        if (!target.stages || typeof target.stages !== 'object' || Array.isArray(target.stages)) {
          errors.push(`target ${targetName}.stages must be an object`);
          continue;
        }
        for (const [stageName, stage] of Object.entries(target.stages)) {
          if (!SAFE_NAME.test(stageName)) errors.push(`invalid stage name ${JSON.stringify(stageName)}`);
          if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
            errors.push(`stage ${targetName}/${stageName} must be an object`);
            continue;
          }
          if (!STAGE_STATUSES.has(stage.status)) {
            errors.push(`stage ${targetName}/${stageName} has invalid status ${JSON.stringify(stage.status)}`);
          }
          if (!Number.isInteger(stage.attempts) || stage.attempts < 0) {
            errors.push(`stage ${targetName}/${stageName}.attempts must be a non-negative integer`);
          }
        }
      }
    }
    if (!Array.isArray(manifest.events)) errors.push('events must be an array');
  }
  if (errors.length > 0) {
    fail(`${path} is invalid:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  }
}

function init(args) {
  const [runTimestamp, topicScope, rawCap, timeWindow, topic] = args;
  if (!runTimestamp || !topicScope || !rawCap || !timeWindow || !topic) usage();
  assertRunTimestamp(runTimestamp);
  if (!['broad', 'narrow'].includes(topicScope)) fail(`invalid topic scope: ${topicScope}`);
  const cap = Number(rawCap);
  if (!Number.isInteger(cap) || cap < 1 || cap > 5) fail(`invalid cap: ${rawCap}`);

  const path = manifestPath(runTimestamp);
  const request = { topicScope, cap, timeWindow, topic };
  if (existsSync(path)) {
    const existing = readManifest(runTimestamp).manifest;
    if (JSON.stringify(existing.request) !== JSON.stringify(request)) {
      fail(`existing manifest request does not match init request: ${path}`);
    }
    console.log(path);
    return;
  }

  const timestamp = now();
  const manifest = {
    manifestVersion: MANIFEST_VERSION,
    runTimestamp,
    status: 'running',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    message: null,
    request,
    targets: {},
    events: [
      {
        at: timestamp,
        target: 'workflow',
        stage: 'manifest',
        status: 'passed',
        message: 'Run manifest initialized.',
      },
    ],
  };
  atomicWrite(path, manifest);
  console.log(path);
}

function mark(args) {
  const [runTimestamp, targetName, stageName, status, message = null] = args;
  if (!runTimestamp || !targetName || !stageName || !status) usage();
  assertSafeName(targetName, 'target');
  assertSafeName(stageName, 'stage');
  if (!STAGE_STATUSES.has(status)) fail(`invalid stage status: ${status}`);
  if (message && message.length > 500) fail('stage message must be at most 500 characters');

  const { manifest, path } = readManifest(runTimestamp);
  const timestamp = now();
  const target = manifest.targets[targetName] || { stages: {} };
  const current = target.stages[stageName] || {
    status: 'pending',
    attempts: 0,
    startedAt: null,
    completedAt: null,
    updatedAt: timestamp,
    message: null,
  };

  if (status === 'in_progress' && current.status !== 'in_progress') {
    current.attempts += 1;
    current.startedAt = timestamp;
    current.completedAt = null;
  }
  if (['passed', 'failed', 'skipped'].includes(status)) {
    current.completedAt = timestamp;
  }

  current.status = status;
  current.updatedAt = timestamp;
  current.message = message || null;
  target.stages[stageName] = current;
  manifest.targets[targetName] = target;
  manifest.updatedAt = timestamp;
  if (status === 'in_progress' && manifest.status !== 'running') {
    manifest.status = 'running';
    manifest.completedAt = null;
    manifest.message = null;
  }
  manifest.events.push({
    at: timestamp,
    target: targetName,
    stage: stageName,
    status,
    message: message || null,
  });
  validateManifest(manifest, path);
  atomicWrite(path, manifest);
  console.log(path);
}

function finish(args) {
  const [runTimestamp, status, message = null] = args;
  if (!runTimestamp || !status) usage();
  if (!['completed', 'failed', 'no-output'].includes(status)) {
    fail(`invalid terminal status: ${status}`);
  }
  if (message && message.length > 500) fail('run message must be at most 500 characters');

  const { manifest, path } = readManifest(runTimestamp);
  if (status !== 'failed') {
    const active = [];
    for (const [targetName, target] of Object.entries(manifest.targets)) {
      for (const [stageName, stage] of Object.entries(target.stages)) {
        if (stage.status === 'in_progress') active.push(`${targetName}/${stageName}`);
      }
    }
    if (active.length > 0) {
      fail(`cannot finish ${status} with active stages: ${active.join(', ')}`);
    }
  }

  const timestamp = now();
  manifest.status = status;
  manifest.updatedAt = timestamp;
  manifest.completedAt = timestamp;
  manifest.message = message || null;
  manifest.events.push({
    at: timestamp,
    target: 'workflow',
    stage: 'run',
    status,
    message: message || null,
  });
  validateManifest(manifest, path);
  atomicWrite(path, manifest);
  console.log(path);
}

function verify(args) {
  const [runTimestamp] = args;
  if (runTimestamp) {
    const { path } = readManifest(runTimestamp);
    console.log(`[run-manifest] valid: ${path}`);
    return;
  }
  if (!existsSync(RUNS_ROOT)) {
    console.log(`[run-manifest] valid: 0 manifest(s)`);
    return;
  }
  let count = 0;
  for (const entry of readdirSync(RUNS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    readManifest(entry.name);
    count += 1;
  }
  console.log(`[run-manifest] valid: ${count} manifest(s)`);
}

function assertIdle(args) {
  const [runTimestamp] = args;
  if (!runTimestamp) usage();
  const { manifest, path } = readManifest(runTimestamp);
  const active = [];
  for (const [targetName, target] of Object.entries(manifest.targets)) {
    for (const [stageName, stage] of Object.entries(target.stages)) {
      if (stage.status === 'in_progress') active.push(`${targetName}/${stageName}`);
    }
  }
  if (active.length > 0) fail(`active stages remain in ${path}: ${active.join(', ')}`);
  console.log(`[run-manifest] idle: ${path}`);
}

function assertGenerationComplete(args) {
  const [runTimestamp] = args;
  if (!runTimestamp) usage();
  assertIdle([runTimestamp]);
  const { manifest, path } = readManifest(runTimestamp);
  const triageStatus = manifest.targets.triage?.stages?.triage?.status;
  if (triageStatus !== 'passed') {
    fail(`triage/triage must be passed before bundling ${path}; found ${JSON.stringify(triageStatus)}`);
  }

  const reportFolders = existsSync(IDEAS_ROOT)
    ? readdirSync(IDEAS_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${runTimestamp}-`))
      .map((entry) => entry.name)
      .sort()
    : [];

  const missing = [];
  for (const folder of reportFolders) {
    for (const stageName of REQUIRED_REPORT_STAGES) {
      const status = manifest.targets[folder]?.stages?.[stageName]?.status;
      if (status !== 'passed') missing.push(`${folder}/${stageName}=${status || 'missing'}`);
    }
  }
  if (missing.length > 0) {
    fail(`current-run report stages are incomplete:\n${missing.map((item) => `  - ${item}`).join('\n')}`);
  }
  console.log(
    `[run-manifest] generation complete: ${reportFolders.length} report folder(s), ${path}`,
  );
}

function show(args) {
  const [runTimestamp] = args;
  if (!runTimestamp) usage();
  const { manifest } = readManifest(runTimestamp);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

const [command, ...args] = process.argv.slice(2);
if (command === 'init') init(args);
else if (command === 'mark') mark(args);
else if (command === 'finish') finish(args);
else if (command === 'verify') verify(args);
else if (command === 'assert-idle') assertIdle(args);
else if (command === 'assert-generation-complete') assertGenerationComplete(args);
else if (command === 'show') show(args);
else usage();
