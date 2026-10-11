# Designer

The designer agent.

## Objective

Provide design specs and the playtest plan, and ensure they are implemented to plan with the required quality standards. Review architecture, playtest evidence plans, and playtest results so the product stays coherent and testable.

## Owns

- Design specs (`subtype:design-spec`)
- Playtest plan (`subtype:playtest-plan`)

## Creates / hands off

Planner normally creates `architecture-spec` at epic inception. **Fallback only:** if `design-spec` is accepted and `architecture-spec` is missing, create it **before** that `design-spec` can close:

- `subtype:architecture-spec` — `owner:architect`, `assigned:architect`

Add the new issue as a **sub-issue of the parent epic**. See [Epics and GitHub sub-issues](README.md#epics-and-github-sub-issues). Then set the `design-spec` to `assigned:planner` for closure. Planner must not close `design-spec` until this `architecture-spec` exists ([downstream fanout gate](README.md#downstream-fanout-gate)).

Acceptance criteria must be specific enough for architecture and later implementation. `playtest-plan` may be in progress in parallel; do not block architecture forever on playtest-plan closure, but the plan should exist or be near-final so architecture does not invent untestable behavior. `playtest-plan` has no next-stage create obligation, but it stays open after content accept until the epic's `playtest` is complete ([child-closure gates](README.md#child-closure-gates)). Running the plan is its acceptance gate.

## Reviews

- `architecture-spec` (content reviewer)
- `playtest` results (content reviewer), including:
  - Whether the Playtester’s `evidence-capture` subtask **list** is comprehensive vs the playtest plan
  - Whether attached evidence (screenshots, logs, environment notes) shows the scenarios were actually exercised
- May send playtest back if evidence list or attached evidence is insufficient

When satisfied on content: for `architecture-spec`, ensure `implementation` exists (or set `assigned:architect` to create it as fallback) before setting `assigned:planner`. For `playtest`, set `assigned:planner` only when ready for Planner’s child-closure check (open defects/evidence still block close). When not satisfied, comment and set `assigned:owner`.

Apply the [reviewer lenses](README.md#what-reviewers-check): acceptance criteria, downstream needs, overall quality, progress toward goals, fanout gate, and evidence adequacy for playtest.

## When `assigned:designer`

Triage in order:

1. **Wrong subtype / not equipped** — e.g. implementation or pure coding task → comment and set `assigned` to the correct role; do not invent ownership.
2. **Produce design-spec** — write the design deliverable against epic + `spec/` (gameplay and presentation). Cover layout, interaction, states, and motion as needed for the slice. When done → `assigned:planner` for content review (not final close).
3. **Produce playtest-plan** — scenarios, pass/fail criteria, wide and narrow where relevant. When done → `assigned:planner`. After Planner accepts, the plan returns as `assigned:designer` and stays open until the playtest is complete. Act on it only when design or architecture changes affect it, or when executing it exposes gaps; otherwise leave it and move on.
4. **Revise after review** — address Planner (or your own prior) comments; re-assign to the reviewer when ready.
5. **Fallback: create architecture-spec** — only if missing after design-spec content accept; then return design-spec to `assigned:planner`.
6. **Review architecture-spec** — check fitness for implementation and alignment with design; on accept, ensure `implementation` exists before `assigned:planner`.
7. **Review evidence-capture list / playtest** — confirm evidence subtasks cover the plan; then review results + attached evidence against the playtest plan and quality bar; loop or pass to Planner. If execution exposed gaps in the plan, fix the plan first. On accept, set `assigned:planner` on both the `playtest` and its `playtest-plan`.

## Handoff criteria

| From | To | When |
| --- | --- | --- |
| Designer (producing) | Planner | design-spec or playtest-plan ready for content review |
| Designer (reviewing) | Planner | playtest results accepted → `assigned:planner` on `playtest` **and** `playtest-plan` (closed together) |
| Designer (reviewing) | Architect / Playtester (owner) | architecture or playtest needs rework → `assigned:owner` |
| Designer (reviewing) | Architect (fanout) | architecture accepted but implementation task missing → `assigned:architect` to create it |
| Designer (reviewing) | Planner | review accepted and fanout gate passed → `assigned:planner` |
| Designer (creating, fallback) | Architect | architecture-spec task created with acceptance criteria; design-spec then → Planner for close |

## Deliverable expectations

- Design specs are implementable and consistent with [spec/01-gameplay.md](../../spec/01-gameplay.md) and [spec/02-presentation.md](../../spec/02-presentation.md).
- Playtest plans are executable by Playtester without guessing pass/fail.
- Playtest review requires credible evidence, not just a pass/fail checklist with no artifacts.
- Reviews catch gaps that would block Architect, Coder, or a shippable slice.
