# Handoff protocol

Every Bizidea specialist agent must end its turn with **exactly one** fenced
`HANDOFF` block and no other prose after it. The orchestrator (the `Bizidea`
agent itself, not a separate parser) reads this block to decide whether to
advance, retry, or skip. Inconsistent shapes cause the orchestrator to treat
the response as a soft failure.

## Emit once, then stop

The HANDOFF block must appear **once per turn**, as the final thing you
write, and your turn ends immediately after the closing fence. Do not:

- repeat the block after each internal checkpoint, draft, reflection,
  revision, retry, or linter pass;
- re-emit the block in a different style (fenced vs. bare, with or without a
  language tag) to "try again";
- print any prose, status update, or summary after the closing fence.

If you have already emitted the block, you are done — do not write anything
else, even if a later self-check makes you want to repeat or reformat it.
Duplicate blocks pollute the orchestrator's reading and do not trigger a
second run.

## Success block

```
HANDOFF
status: ok
path: <absolute path to the file the agent wrote>
... (agent-specific success fields)
```

- `status: ok` is required even when the rest of the block already implies
  success — the orchestrator switches on this field.
- `path` is required for any agent that writes a single artifact file. Use the
  absolute path; do not paraphrase.
- Agent-specific fields (`slug`, `pitch`, `som_y3`, `funding_ask`, etc.) come
  next; their names and types are defined in each agent's own Handoff section.
- Do not return any prose, code fences, or explanation outside the block.

## Failure block

```
HANDOFF
status: failed
reason: <one sentence explaining why no artifact was written>
```

- Use this when an input is missing, contradictory, or the agent cannot
  satisfy its quality bar. Do not write a partial artifact and report success.
- If a partial file was created during a failed run, delete it before
  returning. The orchestrator treats `status: failed` as authoritative.
- The orchestrator retries the same specialist exactly once with the same
  inputs and the validation error. A second failure marks only that idea as
  failed; the partial folder is removed before the run continues.

## Outcome taxonomy (orchestrator-only)

Specialists emit only `status: ok` or `status: failed`. The orchestrator
categorizes outcomes into three buckets when summarizing the run:

- **generated** — the per-idea pipeline reached `ZH Translator` with
  `status: ok` and the report folder passed validation.
- **deduped** — `Idea Generator` returned `status: ok` but
  `deduplicate-idea.mjs` flagged the idea as a duplicate; the partial folder is
  removed and no later stage runs.
- **failed** — a specialist returned `status: failed` after one retry; the
  partial folder is removed and the topic is reported as failed.

A "skipped" topic in the orchestrator's final summary is shorthand for
deduped or for triage selecting fewer clusters than `cap` allowed; it is not
a specialist-level state.

## Why this is uniform

The orchestrator's gate-and-retry rule (see `bizidea.agent.md`) only works
when every specialist reports failure the same way. Earlier versions of this
project allowed each agent to invent its own failure shape, which silently
turned retryable failures into stop-the-run errors.
