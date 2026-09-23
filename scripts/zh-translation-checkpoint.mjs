#!/usr/bin/env node

import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function usage() {
  console.error('Usage: node scripts/zh-translation-checkpoint.mjs <save|accept|restore> <source.yaml> <target.zh.yaml>');
  process.exit(2);
}

function validate(sourcePath, targetPath) {
  return spawnSync(process.execPath, [
    'scripts/check-zh-translations.mjs',
    '--pair',
    '--strict-editor',
    sourcePath,
    targetPath,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

const [action, sourceArg, targetArg] = process.argv.slice(2);
if (!['save', 'accept', 'restore'].includes(action) || !sourceArg || !targetArg) usage();

const sourcePath = resolve(sourceArg);
const targetPath = resolve(targetArg);
const checkpointPath = `${targetPath}.validated-draft`;

if (action === 'save') {
  const result = validate(sourcePath, targetPath);
  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    process.exit(result.status ?? 1);
  }
  copyFileSync(targetPath, checkpointPath);
  console.log(`[zh-translation-checkpoint] saved ${checkpointPath}`);
  process.exit(0);
}

if (!existsSync(checkpointPath)) {
  console.error(`[zh-translation-checkpoint] missing checkpoint: ${checkpointPath}`);
  process.exit(1);
}

if (action === 'restore') {
  copyFileSync(checkpointPath, targetPath);
  const result = validate(sourcePath, targetPath);
  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    process.exit(result.status ?? 1);
  }
  rmSync(checkpointPath);
  console.log(`[zh-translation-checkpoint] restored validated draft to ${targetPath}`);
  process.exit(0);
}

const result = validate(sourcePath, targetPath);
if (result.status !== 0) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  console.error(`[zh-translation-checkpoint] edited target is invalid; checkpoint retained at ${checkpointPath}`);
  process.exit(result.status ?? 1);
}
rmSync(checkpointPath);
console.log(`[zh-translation-checkpoint] accepted edited target ${targetPath}`);
