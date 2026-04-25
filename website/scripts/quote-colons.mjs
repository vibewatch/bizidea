#!/usr/bin/env node
// Auto-quote YAML scalar values that contain `: ` (which YAML treats as a mapping).
// Idempotent; skips lines that are already quoted, block scalars, sequences, or comments.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDEAS_DIR = resolve(__dirname, '../../ideas');

// Match `<indent><key>: <value>` where value contains `: ` and isn't already
// quoted, a block scalar, or a flow collection.
const RE = /^(\s*[A-Za-z_][\w-]*:\s+)(?!["'|>{[\s#-])([^\n]*?: [^\n]*?)\s*$/;

function fixContent(text) {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(RE);
      if (!m) return line;
      const value = m[2].trim();
      // Already balanced quotes? leave alone
      if (/^["'].*["']$/.test(value)) return line;
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `${m[1]}"${escaped}"`;
    })
    .join('\n');
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (p.endsWith('.yaml')) yield p;
  }
}

let fixed = 0;
for (const file of walk(IDEAS_DIR)) {
  const before = readFileSync(file, 'utf8');
  const after = fixContent(before);
  if (before === after) continue;
  writeFileSync(file, after);
  fixed++;
  console.log(`fixed ${file}`);
}
console.log(`done (${fixed} file(s) updated)`);
