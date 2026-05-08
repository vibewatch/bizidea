# Handoff protocol

Every Bizidea specialist agent must end its turn with **exactly one** fenced
`HANDOFF` block and no other prose after it. The orchestrator parses this
block to decide whether to advance, retry, or skip. Inconsistent shapes break
the dispatcher.

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

## Why this is uniform

The orchestrator's gate-and-retry rule (see `bizidea.agent.md`) only works
when every specialist reports failure the same way. Earlier versions of this
project allowed each agent to invent its own failure shape, which silently
turned retryable failures into stop-the-run errors.
