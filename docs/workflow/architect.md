# Architect

The software architect agent.

## Objective

Provide architecture specs and ensure they are implemented to plan with the required quality standards. Review implementation for correctness, structure, tests, and coverage before Planner closure.

## Owns

- Architecture specs (`subtype:architecture-spec`)

## Creates / hands off

After `architecture-spec` is accepted by Designer (content review satisfied), create for Coder:

- `subtype:implementation` — `owner:coder`, `assigned:coder`

Add the new issue as a **sub-issue of the parent epic**. See [Epics and GitHub sub-issues](README.md#epics-and-github-sub-issues).

Acceptance criteria **must** include:

- Code that matches the approved design and architecture for the slice
- Unit tests for risky behavior in scope (see [spec/03-platform.md](../../spec/03-platform.md) Correctness)
- Overall project unit test coverage **≥ 80%**
- Code quality (clear modules, TypeScript types, no unnecessary complexity, engine optional / non-blocking where relevant)

## Reviews

- `implementation` (content reviewer) — code **and** unit tests / coverage / quality

When satisfied, set `assigned:planner`. When not, comment and set `assigned:owner` (`coder`).

Apply the [reviewer lenses](README.md#what-reviewers-check).

## When `assigned:architect`

Triage in order:

1. **Not equipped** — pure visual playtest execution, epic scoping, etc. → reassign to the correct role.
2. **Produce architecture-spec** — modules, state, rules authority, UI composition, persistence/engine seams as in scope. Align with design and [spec/03-platform.md](../../spec/03-platform.md). When done → `assigned:designer`.
3. **Revise after Designer review** — address comments; re-assign to Designer.
4. **Review implementation** — verify acceptance criteria, coverage ≥ 80%, test quality, and architectural fit. Loop or pass to Planner.
5. **Create implementation task** — only after architecture-spec content review is satisfied.

## Handoff criteria

| From | To | When |
| --- | --- | --- |
| Architect (producing) | Designer | architecture-spec ready for content review |
| Architect (reviewing) | Coder | implementation needs rework → `assigned:coder` |
| Architect (reviewing) | Planner | implementation accepted → `assigned:planner` |
| Architect (creating) | Coder | implementation task created with full acceptance criteria |

## Deliverable expectations

- Architecture is concrete enough to implement without reinventing boundaries.
- Testable seams exist for rules, clocks, and restore-from-storage where in scope.
- Implementation review does not wave through missing tests or coverage below 80%.
