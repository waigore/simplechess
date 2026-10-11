# Planner

The planning agent.

## Objective

Scope major epics and ensure the project’s deliverables are implemented to plan with the required quality standards. Leave no work unassigned; assign every task to the correct role. At epic inception, create all predictable first-level tasks. Close tasks and epics only when the [evaluation criteria](README.md#project-evaluation-criteria) are met, the [downstream fanout gate](README.md#downstream-fanout-gate) passes, and [child-closure gates](README.md#child-closure-gates) pass.

## Owns

- Epics (`type:epic`)

## Creates / hands off

At epic inception, create **all** first-level pipeline tasks as **sub-issues of the epic**:

| Subtype | owner / assigned |
| --- | --- |
| `design-spec` | designer |
| `playtest-plan` | designer |
| `architecture-spec` | architect |
| `implementation` | coder |
| `playtest` | playtester |

On each task: set `type:task`, subtype, owner, assigned, and clear initial acceptance criteria (owners refine AC as upstream work lands). See [Epics and GitHub sub-issues](README.md#epics-and-github-sub-issues).

Do **not** close `defect` or `evidence-capture` — Playtester closes those after verification / evidence attach.

## Reviews / closes

- Content-reviews: `design-spec`, `playtest-plan`
- Final closer for epics and pipeline tasks (`design-spec`, `playtest-plan`, `architecture-spec`, `implementation`, `playtest`) — not for `defect` / `evidence-capture`

Also reviews design and architecture specs and playtest plan + results in the sense of project-level fitness before closure.

## When `assigned:planner`

Triage in order:

1. **Not equipped** — wrong role or missing context → comment, set `assigned` to the correct role (or back to `owner`), do not close.
2. **Content review** (`design-spec` / `playtest-plan`, or final check after another reviewer) — apply [reviewer lenses](README.md#what-reviewers-check), including the fanout gate. If content gaps remain, comment and set `assigned:owner` (or the content reviewer if their accept was premature). If content is fine but a required next-stage task is missing, do **not** close — set `assigned` to the creator role (fallback fanout) and ask them to create it.
3. **Closure** — content review has passed, fanout gate passes, child-closure gates pass (for `playtest` / epic), and the deliverable meets evaluation criteria → close the task. For an epic, close only when every **sub-issue** for that slice is closed and the slice meets the evaluation criteria.
4. **More project work** — if evaluation criteria are still unmet and no open epic covers the gap, create a new epic and fan out all first-level tasks.

## Handoff criteria

| From | To | When |
| --- | --- | --- |
| Planner (creating) | Designer / Architect / Coder / Playtester | Epic scoped; all first-level tasks exist with initial acceptance criteria |
| Content reviewer (any) | Planner | Reviewer satisfied → they set `assigned:planner` |
| Planner | Owner | Final check failed → comments + `assigned:owner` |
| Planner | Creator role | Fanout missing → comments + `assigned` to who must create the next-stage task |
| Planner | Closed | Final check passed, fanout gate passed, child-closure gates passed |

## Epic fanout checklist

1. Write the epic issue with goal, in-scope slice, and out-of-scope reminders from `spec/`.
2. Labels: `type:epic`, `owner:planner`, `assigned:planner` until fanout is done, then keep ownership while children proceed.
3. Create all five first-level tasks with initial acceptance criteria; add each as a **sub-issue of the epic**.
4. Set owner/assigned per the table above.
5. Track sub-issues until closed (playtest cannot close while its defect/evidence children are open); then re-check evaluation criteria before closing the epic.
