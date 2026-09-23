#!/usr/bin/env node
// Auto-quote YAML scalar values that contain `: ` (which YAML treats as a mapping).
// Idempotent; skips lines that are already quoted, block scalars, sequences, or comments.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDEAS_DIR = resolve(__dirname, '../../ideas');

/**
 * Auto-quote YAML scalar values that contain `: ` (which YAML treats as a mapping).
 * Idempotent; skips lines that are already quoted, block scalars, sequences, or comments.
 * 
 * Example:
 * Input:  key: value: more text
 * Output: key: "value: more text"
 */
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
    try {
      const s = statSync(p);
      if (s.isDirectory()) yield* walk(p);
      else if (p.endsWith('.yaml')) yield p;
    } catch (e) {
      console.warn(`[quote-colons] skipped ${p}: ${e.message}`);
    }
  }
}

try {
  if (!existsSync(IDEAS_DIR)) {
    console.warn(`[quote-colons] ${IDEAS_DIR} not found; nothing to process.`);
    process.exit(0);
  }

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of walk(IDEAS_DIR)) {
    try {
      const before = readFileSync(file, 'utf8');
      const after = fixContent(before);
      if (before === after) {
        skipped++;
        continue;
      }
      writeFileSync(file, after);
      fixed++;
      console.log(`[quote-colons] ✓ fixed ${file}`);
    } catch (e) {
      console.error(`[quote-colons] error processing ${file}: ${e.message}`);
      errors++;
    }
  }

  console.log(`[quote-colons] ✓ complete — ${fixed} fixed, ${skipped} unchanged, ${errors} error(s)`);
  process.exit(errors > 0 ? 1 : 0);
} catch (e) {
  console.error(`[quote-colons] fatal error: ${e.message}`);
  process.exit(1);
}
