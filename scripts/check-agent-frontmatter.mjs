#!/usr/bin/env node
// Cross-checks `.github/agents/bizidea.agent.md`'s `agents:` frontmatter list
// against each specialist's `name:` field. The orchestrator references
// specialists by display name, so renaming a specialist's `name:` silently
// breaks the dispatch list. This script catches that drift in CI.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_DIR = join(ROOT, '.github', 'agents');
const ORCHESTRATOR_FILE = join(AGENTS_DIR, 'bizidea.agent.md');

function readFrontmatter(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return yaml.load(match[1]);
}

const orchestrator = readFrontmatter(ORCHESTRATOR_FILE);
if (!orchestrator || !Array.isArray(orchestrator.agents)) {
  console.error(`[check-agent-frontmatter] ${ORCHESTRATOR_FILE} is missing an \`agents:\` array in frontmatter`);
  process.exit(1);
}

const declared = new Set(orchestrator.agents);

const specialistFiles = readdirSync(AGENTS_DIR)
  .filter((f) => f.endsWith('.agent.md') && f !== 'bizidea.agent.md')
  .map((f) => join(AGENTS_DIR, f));

const found = new Map();
const errors = [];

for (const file of specialistFiles) {
  const fm = readFrontmatter(file);
  if (!fm || typeof fm.name !== 'string' || fm.name.trim().length === 0) {
    errors.push(`${file}: missing or empty \`name:\` in frontmatter`);
    continue;
  }
  if (found.has(fm.name)) {
    errors.push(`duplicate display name "${fm.name}" in ${file} and ${found.get(fm.name)}`);
    continue;
  }
  found.set(fm.name, file);
}

const orphanInOrchestrator = orchestrator.agents.filter((n) => !found.has(n));
const orphanSpecialists = [...found.keys()].filter((n) => !declared.has(n));

if (orphanInOrchestrator.length > 0) {
  errors.push(
    `bizidea.agent.md references unknown agent name(s): ${orphanInOrchestrator.join(', ')}. ` +
      `Found specialist names: ${[...found.keys()].join(', ') || '(none)'}.`,
  );
}

if (orphanSpecialists.length > 0) {
  errors.push(
    `specialist name(s) not listed in bizidea.agent.md \`agents:\`: ${orphanSpecialists.join(', ')}. ` +
      `If a specialist is intentionally orchestrator-private, remove its \`*.agent.md\` file or document the exception here.`,
  );
}

if (errors.length > 0) {
  for (const err of errors) console.error(`[check-agent-frontmatter] ${err}`);
  process.exit(1);
}

console.log(`[check-agent-frontmatter] ok: ${found.size} specialists match bizidea.agent.md \`agents:\``);
