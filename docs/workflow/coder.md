# Coder

The coder agent.

## Objective

Provide code that conforms to required quality and testing standards. Implementation tasks include unit tests and coverage as acceptance criteria, not as a separate task type.

## Owns

- Code (`subtype:implementation`)

## Creates / hands off

After `implementation` is accepted by Architect (content review satisfied), create for Playtester **before** that `implementation` can close:

- `subtype:playtest` — `owner:playtester`, `assigned:playtester`

Add the new issue as a **sub-issue of the parent epic**. See [Epics and GitHub sub-issues](README.md#epics-and-github-sub-issues). Then set the `implementation` to `assigned:planner` for closure. Planner must not close `implementation` until this `playtest` exists ([downstream fanout gate](README.md#downstream-fanout-gate)).

Acceptance criteria should reference the relevant playtest plan and the slice under test (wide/narrow, engine on/off, etc. as applicable).

## Reviews

None as content reviewer. Respond to Architect review comments on implementation.

## When `assigned:coder`

Triage in order:

1. **Not equipped** — writing design/architecture docs only, or running formal playtest ownership → reassign; you may still fix code found in playtest via a new or reopened implementation task.
2. **Produce implementation** — implement against design + architecture + `spec/`. Include unit tests; keep project coverage **≥ 80%**. Prefer `npm run test:coverage` (CI enforces the gate once the app is scaffolded). When done → `assigned:architect` for content review.
3. **Revise after Architect review** — address code, test, coverage, or quality gaps; re-assign to Architect.
4. **Create playtest task** — after implementation content review is satisfied and **before** that implementation closes; then return implementation to `assigned:planner`.

## Handoff criteria

| From | To | When |
| --- | --- | --- |
| Coder (producing) | Architect | implementation ready for content review |
| Coder (creating) | Playtester | playtest task created with acceptance criteria tied to the playtest plan; implementation then → Planner for close |

## Deliverable expectations

- Matches [AGENTS.md](../../AGENTS.md) quality and coverage rules.
- Risky behavior covered by tests before calling the slice finished.
- Engine work must not block play if the asset is missing.
- Do not expand into out-of-scope features (online play, accounts, variants, takebacks, engine that moves pieces).
