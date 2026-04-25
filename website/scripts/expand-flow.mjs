#!/usr/bin/env node
// Convert `- { id: N, publisher: P, title: T, date: D, url: U }` flow-style citation
// entries to block style with quoted strings, since unquoted titles often contain `: `.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDEAS_DIR = resolve(__dirname, '../../ideas');

function splitFlow(inner) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of inner) {
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') depth--;
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function quote(v) {
  v = v.trim();
  if (v === 'null' || /^-?\d/.test(v) || /^(true|false)$/.test(v)) return v;
  if (/^["'].*["']$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function convertLine(line) {
  const m = line.match(/^(\s*)- \{(.+)\}\s*$/);
  if (!m) return line;
  const indent = m[1];
  const inner = m[2];
  const parts = splitFlow(inner);
  const lines = [];
  for (let i = 0; i < parts.length; i++) {
    const colonIdx = parts[i].indexOf(':');
    if (colonIdx < 0) return line;
    const key = parts[i].slice(0, colonIdx).trim();
    const val = parts[i].slice(colonIdx + 1).trim();
    const prefix = i === 0 ? `${indent}- ${key}: ` : `${indent}  ${key}: `;
    lines.push(prefix + quote(val));
  }
  return lines.join('\n');
}

let fixed = 0;
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (p.endsWith('.yaml')) yield p;
  }
}

for (const file of walk(IDEAS_DIR)) {
  const before = readFileSync(file, 'utf8');
  const after = before.split('\n').map(convertLine).join('\n');
  if (before === after) continue;
  try { yaml.load(after); } catch (e) {
    console.error(`[skip] ${file}: ${e.message.split('\n')[0]}`);
    continue;
  }
  writeFileSync(file, after);
  fixed++;
  console.log(`fixed ${file}`);
}
console.log(`done (${fixed} file(s))`);
