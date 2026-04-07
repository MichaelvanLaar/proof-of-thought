# Project Overview

@AGENTS.md

## File Conventions

Primary file types in this project: YAML (CI/CD configs), JSON (settings/config), Markdown (documentation). When editing these, preserve existing formatting and indentation conventions.

### Key Config Files — @.claude/config-files.md

**Read when:** Locating a specific config file or understanding its purpose.

## Configuration Management

When running config optimization or audit tasks, always check for duplicate entries across `.claude/settings.json`, `.claude/settings.local.json`, and project-level configs before proposing changes.

## Commands

```
npm run ci          # Full validation: lint + typecheck + test:coverage + build
npm test            # Run tests (Vitest)
npm run lint        # ESLint
npm run lint:fix    # ESLint with auto-fix
npm run typecheck   # TypeScript type check
npm run build       # Build all targets
npm run format      # Prettier format
npm run format:check
```

## Publishing

Use the `/release` skill for the full release workflow.

## GitHub Integration

- `@claude` trigger in issues/PRs via `claude.yml` workflow.
- Automatic PR reviews via `claude-code-review.yml`.

## OpenSpec

This project uses OpenSpec for structured change management.
See `openspec/config.yaml` for workflow configuration.

### Project Architecture — @openspec/project.md

**Read when:** Working with OpenSpec workflows, architecture decisions, or domain context for neurosymbolic reasoning.

## Git Workflow

For commits, use descriptive multi-line commit messages that summarize all changed files. Always check for unstaged changes before committing.

## Don't

- Don't use `any` types — strict TypeScript throughout.
- Don't commit secrets or credentials to git.
- Don't use `--force` flags — fix the underlying issue instead.
- Don't skip pre-commit hooks with `--no-verify`.

## Learnings

When the user corrects a mistake or points out a recurring issue, append a one-line
summary to .claude/learnings.md. Don't modify CLAUDE.md directly.

## Compact Instructions

When compacting, preserve: list of modified files, current test status, open TODOs, and key decisions made.

## Handoff

Before ending a session, the user may invoke `/handoff` to create a machine-transfer summary.
When resuming work, always check if HANDOFF.md exists in the project root. If it does, read it
first and continue from where it left off. After confirming the context is restored, delete the file.
