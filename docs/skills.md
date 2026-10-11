# Project skills

Project skills live in `.agents/skills`. That directory is the only copy. Add and edit skills there.

Each skill is a folder with a `SKILL.md` file:

```
.agents/skills/<skill-name>/SKILL.md
```

Put supporting files (scripts, references, templates) next to that `SKILL.md`. Paths inside the skill are relative to the skill folder.

`SKILL.md` starts with YAML frontmatter. `name` and `description` are required. The description says what the skill does and when to use it.

```markdown
---
name: example
description: What this skill does and when to use it.
---
```

## Native entrypoints

Coding agents may still load skills from their own project folder. In this repo those folders are symlinks to `.agents/skills`:

| Agent | Entrypoint |
| --- | --- |
| Grok | `.grok/skills` |
| Cursor | `.cursor/skills` |
| OpenCode | `.opencode/skills` |
| Claude Code | `.claude/skills` |

Grok, OpenCode, and Codex also read `.agents/skills` directly. Leave the symlinks in place so an agent that only checks its native folder still sees the same skills.

Do not replace a symlink with a real directory, and do not copy a skill into a native folder. A second copy will drift. An agent that needs a new native path gets another symlink to `.agents/skills`, using the same pattern.

## Add a skill

1. Create `.agents/skills/<skill-name>/SKILL.md` with `name` and `description`.
2. Keep the instructions specific to one repeatable task. Product behavior stays in `spec/`.
3. Confirm the native entrypoints still point at `.agents/skills` (`ls -l .grok/skills .cursor/skills .opencode/skills .claude/skills`).
