# Agent workflow

Agents coordinate through labeled tasks. Each role has objectives, ownership, and handoffs. Agents create the next deliverable tasks themselves, review upstream work, and keep going until the [project evaluation criteria](#project-evaluation-criteria) are met.

Product behavior stays in `spec/`. Agent operating rules live here. Project-wide quality bars (including coverage) are also in [AGENTS.md](../../AGENTS.md).

## Directory

| File | Role |
| --- | --- |
| [planner.md](planner.md) | Planning agent — epics, fanout, closure |
| [designer.md](designer.md) | Design specs and playtest plan |
| [architect.md](architect.md) | Architecture specs; reviews implementation |
| [coder.md](coder.md) | Code and unit tests |
| [playtester.md](playtester.md) | Playtest results |

## Pipeline

```text
epic
  → design-spec + playtest-plan
  → architecture-spec
  → implementation  (code + unit tests in acceptance criteria)
  → playtest
```

One task tracks one deliverable. Progress, comments, and quality notes stay on that task.

## Epics and GitHub sub-issues

Epics and tasks are GitHub Issues.

- The epic issue is the **parent**.
- Every task that belongs to that epic is a **sub-issue** of that parent (GitHub’s sub-issue relationship), not only a label or a text mention.
- When any agent creates a task for an epic—Planner’s first fanout or later `architecture-spec` / `implementation` / `playtest` tasks—create the issue, apply labels and acceptance criteria, then **add it as a sub-issue of the epic**.
- Do not use checkbox task lists or “blocked by” links as a substitute for sub-issues.
- Planner closes the epic only when its sub-issues for that slice are closed and the evaluation criteria are met.

## Labels

When creating a task, set **type**, **subtype** (tasks only), **owner**, **assigned**, and **acceptance criteria**.

| Label | Format | Values |
| --- | --- | --- |
| Type | `type:<type>` | `epic`, `task` |
| Subtype | `subtype:<task type>` | `design-spec`, `playtest-plan`, `architecture-spec`, `implementation`, `playtest` |
| Owner | `owner:<role>` | `planner`, `designer`, `architect`, `coder`, `playtester` |
| Assigned | `assigned:<role>` | same roles |

- **owner** — who owns the deliverable. Stable for the life of the task.
- **assigned** — who is currently producing or reviewing. Exactly one role at a time.

Handoff = replace the `assigned:` label. The agent who finished their step does the relabel.

## Task creation chain

The upstream agent creates the next task(s), writes acceptance criteria, and sets `owner` + `assigned` to the downstream role.

| Creator | Creates | Initial owner and assigned |
| --- | --- | --- |
| Planner | epic; then `design-spec` and `playtest-plan` | designer |
| Designer | `architecture-spec` | architect |
| Architect | `implementation` | coder |
| Coder | `playtest` | playtester |

Create the next-stage task only after the prerequisite deliverable’s **content reviewer** is satisfied, and **before** the prerequisite task is closed (see [Downstream fanout gate](#downstream-fanout-gate)). Nest every new task under its epic as a [sub-issue](#epics-and-github-sub-issues).

- For an epic, Planner creates both Designer tasks up front as sub-issues of the epic.
- Designer creates `architecture-spec` only after `design-spec` is accepted, and before that `design-spec` closes. `playtest-plan` may proceed in parallel with design work.

### Implementation acceptance criteria

Every `implementation` task must require, at minimum:

- Working code that matches the design and architecture for that slice
- Unit tests for the risky behavior in scope
- Overall project unit test coverage **≥ 80%** (CI-enforced; see [AGENTS.md](../../AGENTS.md))
- Code quality suitable for Architect review (clear structure, typed, no unnecessary complexity)

## Review and closure

### Content reviewers

| subtype | Content reviewer |
| --- | --- |
| `design-spec` | planner |
| `playtest-plan` | planner |
| `architecture-spec` | designer |
| `implementation` | architect |
| `playtest` | designer |

### Loop

1. Owner works while `assigned` is the owner role.
2. Owner finishes → set `assigned` to the content reviewer; leave a short note on what to review.
3. Reviewer is not satisfied → comment with gaps; set `assigned` back to `owner`.
4. Owner refines → set `assigned` back to the reviewer.
5. Repeat until the reviewer is satisfied (content accept).
6. **Fanout before closure handoff** — if this subtype must create a next-stage task ([table above](#task-creation-chain)), that task must exist before anyone treats the work as ready to close. The creator role creates it (labels, acceptance criteria, epic sub-issue), then sets `assigned:planner`. If fanout is still missing when the reviewer would hand off, set `assigned` to the creator role with a short “create next-stage task” note — do not send to Planner for close yet.
7. **Only Planner closes** the task (and epics), after a final check against evaluation criteria **and** the [downstream fanout gate](#downstream-fanout-gate). If either check fails, Planner comments and sets `assigned` back to the role that must act (usually `owner`, or the creator role for missing fanout).

For `design-spec` and `playtest-plan`, Planner is both content reviewer and closer. Treat **accept**, **fanout** (when required), and **close** as separate steps — never collapse accept into close when a next-stage task is still outstanding.

### Downstream fanout gate

**Do not close a task while its required next-stage task is outstanding.** Content quality alone is not enough.

Outstanding means the next-stage issue from the [task creation chain](#task-creation-chain) has not been created yet (missing issue, labels, acceptance criteria, or epic sub-issue link). The next-stage task does **not** need to be finished or closed — it only needs to exist so the pipeline continues.

| Closing this subtype | Required next-stage task (must already exist) | Who creates it |
| --- | --- | --- |
| `design-spec` | `architecture-spec` | designer |
| `architecture-spec` | `implementation` | architect |
| `implementation` | `playtest` | coder |
| `playtest-plan` | — (none) | — |
| `playtest` | — (none) | — |
| `epic` | all sub-issues for the slice closed | — |

Example: do **not** close a `design-spec` after accepting the written design if the Designer has not yet created the `architecture-spec` task for Architect.

Who enforces the gate:

- **Creator role** — create the next-stage task after content accept and before handing to Planner for close.
- **Content reviewers** — before setting `assigned:planner`, confirm the required next-stage task exists (or assign the creator to create it).
- **Planner** — before closing any task, confirm the gate; if fanout is missing, do not close; comment and set `assigned` to the creator role.

### What reviewers check

Beyond the task’s acceptance criteria (defined by the creator), every reviewer also asks:

1. Does this meet the needs of whoever is **downstream** of it?
2. Does it meet **overall quality standards** (specs + [AGENTS.md](../../AGENTS.md))?
3. Does it **move the project toward its goals** / done criteria?
4. If this subtype creates a next-stage task, does that task **already exist** (fanout gate)? If not, do not hand to Planner for close.

## Project evaluation criteria

All agents use this bar to decide whether more work remains, even if local tasks look done:

- [spec/00-overview.md](../../spec/00-overview.md) quality bar (snappy moves, cohesive board, correct rules/clocks/results, engine optional)
- [spec/03-platform.md](../../spec/03-platform.md) Done section (production build, mouse play wide and narrow, persistence, engine present or missing)
- Unit test coverage **≥ 80%**
- Scope stays inside the specs (no online play, accounts, variants, takebacks, engine that moves pieces)

If the bar is not met, create or reopen work; do not treat the project as finished.

## Example fanout — Epic A “Untimed playable game”

Labels on the epic: `type:epic`, `owner:planner`, `assigned:planner` (Planner closes when the slice meets evaluation criteria).

1. Planner creates the epic issue, then **Design: board / setup / mouse / move list** (`subtype:design-spec`) and **Playtest plan: untimed** (`subtype:playtest-plan`) as **sub-issues** of the epic → `owner:designer`, `assigned:designer`.
2. Designer delivers each. Planner content-reviews. For `playtest-plan` (no fanout), Planner may close after accept. For `design-spec`, after accept Designer creates **Architecture: rules + UI state** (`subtype:architecture-spec`) as a sub-issue → `owner:architect`, `assigned:architect`; **only then** Planner closes the `design-spec`.
3. Designer reviews architecture; on accept → Architect creates **Implementation: untimed game** (`subtype:implementation`, AC includes unit tests, ≥80% coverage, code quality) as a sub-issue → `owner:coder`, `assigned:coder`; then `assigned:planner`; Planner closes the `architecture-spec` only after that implementation task exists.
4. Architect reviews implementation; on accept → Coder creates **Playtest: untimed** (`subtype:playtest`) as a sub-issue → `owner:playtester`, `assigned:playtester`; then `assigned:planner`; Planner closes the `implementation` only after that playtest task exists.
5. Designer reviews playtest results; on accept → `assigned:planner`; Planner closes (no further fanout). Planner closes the epic when its sub-issues for that slice are closed and evaluation criteria are met.

## Role summary

| Role | Owns | Hands off (creates for) | Content-reviews |
| --- | --- | --- | --- |
| Planner | epics | designer (`design-spec`, `playtest-plan`) | design-spec, playtest-plan; closes all |
| Designer | design specs, playtest plan | architect (`architecture-spec`) | architecture-spec, playtest |
| Architect | architecture specs | coder (`implementation`) | implementation |
| Coder | code | playtester (`playtest`) | — |
| Playtester | playtest results | — | — |
