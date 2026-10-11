# Simple Chess

Local two-player chess SPA. Read [spec/00-overview.md](spec/00-overview.md) before changing behavior.

## Spec

Product detail lives in `spec/`. Gameplay is [spec/01-gameplay.md](spec/01-gameplay.md). Layout and motion are [spec/02-presentation.md](spec/02-presentation.md). Stack, saving, and the engine are [spec/03-platform.md](spec/03-platform.md).

## Skills

Project skills live only in `.agents/skills`. `.grok/skills`, `.cursor/skills`, `.opencode/skills`, and `.claude/skills` are symlinks to that directory. See [docs/skills.md](docs/skills.md).

## Build

React and TypeScript, one screen, no backend. Persist in the browser only. A local UCI engine is optional and must not be required to play.

## Scope

Build what the spec describes. Leave online play, accounts, variants, takebacks, and an engine that moves the pieces out.

## Quality

Moves are fast and the board looks cohesive. Rules, clocks, and results must be correct. If the engine asset is missing, the game still works.

## Checks

Follow the done criteria in [spec/03-platform.md](spec/03-platform.md). Cover rules and clock changes with tests before calling them finished.
