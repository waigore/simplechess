# Agent workflow

Agents coordinate through labeled tasks. Each role has objectives, ownership, and handoffs. The Planner creates predictable epic subtasks up front; agents refine acceptance criteria, review upstream work, raise defects from playtest, and keep going until the [project evaluation criteria](#project-evaluation-criteria) are met.

Product behavior stays in `spec/`. Agent operating rules live here. Project-wide quality bars (including coverage) are also in [AGENTS.md](../../AGENTS.md).

## Directory

| File | Role |
| --- | --- |
| [planner.md](planner.md) | Planning agent — epics, fanout, closure |
| [designer.md](designer.md) | Design specs and playtest plan |
| [architect.md](architect.md) | Architecture specs; reviews implementation |
| [coder.md](coder.md) | Code, unit tests, and defect fixes |
| [playtester.md](playtester.md) | Playtest results, evidence, defects |

## Pipeline

```text
epic
  → design-spec + playtest-plan
  → architecture-spec
  → implementation  (code + unit tests; closes on Architect accept)
  → playtest
       → evidence-capture  (sub-issues of playtest)
       → defect            (sub-issues of playtest; independent fixes)
```

One task tracks one deliverable. Progress, comments, and quality notes stay on that task.

**Implementation** closes when Architect accepts code, tests, and quality — not when playtest finishes. Product bugs found in playtest become `subtype:defect` issues, not reopeners of the original implementation task.

## Epics and GitHub sub-issues

Epics and tasks are GitHub Issues.

- The epic issue is the **parent** for first-level pipeline tasks.
- Every first-level task that belongs to that epic is a **sub-issue** of that parent (GitHub’s sub-issue relationship), not only a label or a text mention.
- Playtest children (`evidence-capture`, `defect`) are **sub-issues of the playtest task** (second level). They still count toward playtest and epic closure gates.
- When any agent creates a missing pipeline task for an epic (fallback fanout), create the issue, apply labels and acceptance criteria, then **add it as a sub-issue of the epic**.
- Do not use checkbox task lists or “blocked by” links as a substitute for sub-issues.

## Labels

When creating a task, set **type**, **subtype** (tasks only), **owner**, **assigned**, and **acceptance criteria**.

| Label | Format | Values |
| --- | --- | --- |
| Type | `type:<type>` | `epic`, `task` |
| Subtype | `subtype:<task type>` | `design-spec`, `playtest-plan`, `architecture-spec`, `implementation`, `playtest`, `evidence-capture`, `defect` |
| Owner | `owner:<role>` | `planner`, `designer`, `architect`, `coder`, `playtester` |
| Assigned | `assigned:<role>` | same roles |

- **owner** — who owns the deliverable. Stable for the life of the task.
- **assigned** — who is currently producing or reviewing. Exactly one role at a time.

Handoff = replace the `assigned:` label. The agent who finished their step does the relabel.

## Task creation chain

### Planner first-level fanout (primary)

At epic inception, Planner creates **all predictable first-level tasks** as sub-issues of the epic, with initial acceptance criteria (owners refine AC as upstream deliverables land):

| Task subtype | Initial owner and assigned |
| --- | --- |
| `design-spec` | designer |
| `playtest-plan` | designer |
| `architecture-spec` | architect |
| `implementation` | coder |
| `playtest` | playtester |

Do not wait for mid-pipeline accept to create these. `playtest-plan` may proceed in parallel with design work.

### Fallback fanout (if a task is missing)

If a required next-stage task is missing when content is accepted, the creator role creates it (labels, AC, epic sub-issue), then hands the prerequisite to Planner for close:

| Creator (fallback) | Creates | Initial owner and assigned |
| --- | --- | --- |
| Designer | `architecture-spec` | architect |
| Architect | `implementation` | coder |
| Coder | `playtest` | playtester |

### Playtest children (Playtester creates)

Under the `playtest` task (as **sub-issues of that playtest**, not of the epic):

| Creator | Creates | Initial owner and assigned |
| --- | --- | --- |
| Playtester | `evidence-capture` | playtester |
| Playtester | `defect` | coder |

### Implementation acceptance criteria

Every `implementation` task must require, at minimum:

- Working code that matches the design and architecture for that slice
- Unit tests for the risky behavior in scope
- Overall project unit test coverage **≥ 80%** (CI-enforced; see [AGENTS.md](../../AGENTS.md))
- Code quality suitable for Architect review (clear structure, typed, no unnecessary complexity)

### Defect acceptance criteria

Every `defect` must include clear AC in the issue body: steps to reproduce, expected vs actual, and what “fixed” means so Playtester can verify and close.

### Evidence-capture acceptance criteria

Every `evidence-capture` must state what to capture (e.g. screenshots, console/network logs, viewport, engine present/missing) and which playtest-plan scenario(s) it covers.

## Review and closure

### Content reviewers

| subtype | Content reviewer |
| --- | --- |
| `design-spec` | planner |
| `playtest-plan` | planner |
| `architecture-spec` | designer |
| `implementation` | architect |
| `playtest` | designer |
| `evidence-capture` | designer (list comprehensiveness + evidence adequacy as part of playtest review) |
| `defect` | playtester (verifies fix against defect AC) |

### Who closes

| Issue kind | Who closes |
| --- | --- |
| epic, and all subtypes except below | **Planner** only |
| `defect` | **Playtester** (after verifying the fix against the defect’s AC) |
| `evidence-capture` | **Playtester** (after attaching evidence that meets the subtask AC) |

### Loop

1. Owner works while `assigned` is the owner role.
2. Owner finishes → set `assigned` to the content reviewer; leave a short note on what to review.
3. Reviewer is not satisfied → comment with gaps; set `assigned` back to `owner`.
4. Owner refines → set `assigned` back to the reviewer.
5. Repeat until the reviewer is satisfied (content accept).
6. **Fanout before closure handoff** — if this subtype still has a missing next-stage task ([fallback table](#fallback-fanout-if-a-task-is-missing)), create it before treating the work as ready to close. Then set `assigned:planner`. If fanout is still missing when the reviewer would hand off, set `assigned` to the creator role with a short “create next-stage task” note — do not send to Planner for close yet.
7. **Closure** — Planner closes (except `defect` / `evidence-capture`, which Playtester closes) after the final check against evaluation criteria, the [downstream fanout gate](#downstream-fanout-gate), and any [child-closure gates](#child-closure-gates). If a check fails, comment and set `assigned` back to the role that must act.

For `design-spec` and `playtest-plan`, Planner is both content reviewer and closer. Treat **accept**, **fanout** (when required as fallback), and **close** as separate steps.

### Downstream fanout gate

**Do not close a task while its required next-stage task is outstanding.** Content quality alone is not enough.

Outstanding means the next-stage issue has not been created yet (missing issue, labels, acceptance criteria, or epic sub-issue link). The next-stage task does **not** need to be finished or closed — it only needs to exist. With Planner first-level fanout, these usually already exist at epic inception; the gate still applies as a safety check / fallback.

| Closing this subtype | Required next-stage task (must already exist) | Who creates if missing |
| --- | --- | --- |
| `design-spec` | `architecture-spec` | designer |
| `architecture-spec` | `implementation` | architect |
| `implementation` | `playtest` | coder |
| `playtest-plan` | — (none) | — |
| `playtest` | — (none; see [child-closure gates](#child-closure-gates)) | — |
| `evidence-capture` | — (none) | — |
| `defect` | — (none) | — |
| `epic` | all sub-issues for the slice closed (nested children included via playtest gate) | — |

`implementation` may close once Architect accepts and `playtest` exists — **without** waiting for playtest results or defects.

Who enforces the gate:

- **Creator role** — create the missing next-stage task after content accept and before handing to Planner for close.
- **Content reviewers** — before setting `assigned:planner`, confirm the required next-stage task exists (or assign the creator to create it).
- **Planner** — before closing any task, confirm the gate; if fanout is missing, do not close; comment and set `assigned` to the creator role.

### Child-closure gates

| Closing | Gate |
| --- | --- |
| `playtest` | All of its sub-issues (`evidence-capture` and `defect`) are **closed**. Designer has accepted playtest results (including that evidence shows the plan was actually exercised). |
| `epic` | All of its sub-issues for the slice are **closed** (first-level tasks). Because playtest cannot close while its children are open, open defects/evidence under playtest also block the epic. |

### What reviewers check

Beyond the task’s acceptance criteria (defined by the creator), every reviewer also asks:

1. Does this meet the needs of whoever is **downstream** of it?
2. Does it meet **overall quality standards** (specs + [AGENTS.md](../../AGENTS.md))?
3. Does it **move the project toward its goals** / done criteria?
4. If this subtype requires a next-stage task, does that task **already exist** (fanout gate)? If not, do not hand to Planner for close.
5. For `playtest`: is the **evidence-capture** subtask list comprehensive vs the playtest plan, and does attached evidence (logs, screenshots, environment notes) support that the scenarios were really tested?

## Project evaluation criteria

All agents use this bar to decide whether more work remains, even if local tasks look done:

- [spec/00-overview.md](../../spec/00-overview.md) quality bar (snappy moves, cohesive board, correct rules/clocks/results, engine optional)
- [spec/03-platform.md](../../spec/03-platform.md) Done section (production build, mouse play wide and narrow, persistence, engine present or missing)
- Unit test coverage **≥ 80%**
- Scope stays inside the specs (no online play, accounts, variants, takebacks, engine that moves pieces)

If the bar is not met, create or reopen work; do not treat the project as finished.

## Example fanout — Epic A “Untimed playable game”

Labels on the epic: `type:epic`, `owner:planner`, `assigned:planner` (Planner closes when the slice meets evaluation criteria).

1. Planner creates the epic, then **all first-level tasks** as sub-issues: `design-spec`, `playtest-plan`, `architecture-spec`, `implementation`, `playtest` — each with subtype, owner, assigned, and initial AC.
2. Designer delivers design-spec and playtest-plan. Planner content-reviews and closes each when accepted (architecture-spec already exists from step 1).
3. Architect delivers architecture-spec; Designer reviews; Planner closes when accepted (implementation already exists).
4. Coder implements; Architect reviews code + tests + coverage/quality. On accept → `assigned:planner`; Planner closes `implementation` (playtest already exists; playtest need not be finished).
5. Playtester creates `evidence-capture` sub-issues under playtest; Designer reviews list comprehensiveness; Playtester runs scenarios, attaches logs/screenshots, closes evidence-capture when AC met. Failures → `subtype:defect` sub-issues under playtest → `assigned:coder`.
6. Coder fixes defects → `assigned:playtester`; Playtester verifies against defect AC and **closes** each defect.
7. Designer reviews playtest results + evidence; on accept → `assigned:planner`. Planner closes `playtest` only when all playtest children are closed. Planner closes the epic when all epic sub-issues are closed and evaluation criteria are met.

## Role summary

| Role | Owns | Hands off (creates for) | Content-reviews | Closes |
| --- | --- | --- | --- | --- |
| Planner | epics | all first-level epic tasks at inception | design-spec, playtest-plan; closes most tasks/epics | epic + pipeline tasks (not defect/evidence-capture) |
| Designer | design specs, playtest plan | `architecture-spec` (fallback only) | architecture-spec, playtest (+ evidence list/adequacy) | — |
| Architect | architecture specs | `implementation` (fallback only) | implementation | — |
| Coder | code, defect fixes | `playtest` (fallback only) | — | — |
| Playtester | playtest results, evidence-capture | `evidence-capture`, `defect` under playtest | defect fixes | `defect`, `evidence-capture` |
