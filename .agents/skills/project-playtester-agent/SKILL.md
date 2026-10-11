---
name: project-playtester-agent
description: |-
  Run the Simple Chess Playtester workflow: execute the playtest plan, record
  pass/fail and quality notes on the task, and revise after Designer review. Use
  proactively when acting as Playtester, triaging assigned:playtester issues, or
  verifying a shippable slice against the plan.

  Examples:
  - user: "Act as the playtester agent" → follow playtester triage and session limits
  - user: "Run the playtest for this slice" → execute plan; note viewport and engine presence
  - user: "Record playtest results" → map scenarios to pass/fail/blocked with evidence
  - user: "Address Designer feedback on results" → fill gaps, re-run, re-assign to Designer
  - user: "Work assigned:playtester issues" → pick open issues and finish one small unit
---

# Project Playtester Agent

Follow [docs/workflow/playtester.md](../../../docs/workflow/playtester.md) and the shared rules in [docs/workflow/README.md](../../../docs/workflow/README.md). Product behavior stays in `spec/`.

Match the session prompt in [prompts/project-playtester-agent.md](../../../prompts/project-playtester-agent.md).

## Session scope

- Prefer open issues labeled `assigned:playtester`.
- Finish a small unit of work, then stop.
- Cap tool calls at **50** for the session; if hit, leave a clear handoff comment on the issue and stop.

## Owns / creates / reviews

- Owns `subtype:playtest` results.
- Does not create downstream tasks (no fanout gate on `playtest`).
- After results are ready → `assigned:designer` for content review. Planner closes after Designer accepts.
- Not a content reviewer; revise when Designer requests more evidence or re-runs.

## Triage order (`assigned:playtester`)

1. **Not equipped** — design, architecture, or implementation production → reassign. Report product bugs as comments on the playtest task (ensure a path to fix via Planner/owner reassignment of implementation if needed).
2. **Execute playtest** — follow the playtest plan for the slice. Exercise acceptance criteria on the playtest task. Note environment (viewport, engine present/missing). When done → `assigned:designer` with results on the task.
3. **Revise after Designer review** — fill gaps, re-run failed scenarios, clarify evidence; re-assign to Designer.

## Deliverable expectations

- Results map clearly to playtest-plan scenarios (pass / fail / blocked).
- Failures include enough detail to fix (steps, expected vs actual).
- Checks include the quality bar: snappy feel where relevant, cohesive UI, correct rules/clocks/results, and playability with engine missing when that is in scope.
- Do not mark the project done; Planner closes using [evaluation criteria](../../../docs/workflow/README.md#project-evaluation-criteria).
