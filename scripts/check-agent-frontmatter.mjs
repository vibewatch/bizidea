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
const EXPECTED_MODEL = 'GPT-6 Luna (copilot)';

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
if (orchestrator.model !== EXPECTED_MODEL) {
  console.error(
    `[check-agent-frontmatter] ${ORCHESTRATOR_FILE} must pin \`model: "${EXPECTED_MODEL}"\``,
  );
  process.exit(1);
}

const declared = new Set(orchestrator.agents);

const specialistFiles = readdirSync(AGENTS_DIR)
  .filter((f) => f.endsWith('.agent.md') && f !== 'bizidea.agent.md')
  .map((f) => join(AGENTS_DIR, f));

const found = new Map();
const errors = [];

for (const file of specialistFiles) {
  const raw = readFileSync(file, 'utf8');
  const fm = readFrontmatter(file);
  if (!fm || typeof fm.name !== 'string' || fm.name.trim().length === 0) {
    errors.push(`${file}: missing or empty \`name:\` in frontmatter`);
    continue;
  }
  if (found.has(fm.name)) {
    errors.push(`duplicate display name "${fm.name}" in ${file} and ${found.get(fm.name)}`);
    continue;
  }
  if (fm['user-invocable'] !== false) {
    errors.push(`${file}: specialist agents must set \`user-invocable: false\` for parent-only native delegation`);
  }
  if (fm.model !== EXPECTED_MODEL) {
    errors.push(`${file}: must pin \`model: "${EXPECTED_MODEL}"\``);
  }
  if (/handoff-protocol|HANDOFF|status:\s*(ok|failed)/.test(raw)) {
    errors.push(`${file}: custom response protocols are forbidden; rely on native parent/child completion and artifact validation`);
  }
  found.set(fm.name, file);
}

const orchestratorRaw = readFileSync(ORCHESTRATOR_FILE, 'utf8');
if (/handoff-protocol|HANDOFF|status:\s*(ok|failed)/.test(orchestratorRaw)) {
  errors.push(`${ORCHESTRATOR_FILE}: custom response protocols are forbidden; rely on native agent delegation`);
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

console.log(
  `[check-agent-frontmatter] ok: orchestrator and ${found.size} specialists use ${EXPECTED_MODEL}`,
);
