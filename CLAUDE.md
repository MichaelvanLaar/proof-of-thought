# Project Overview

@AGENTS.md

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
@openspec/project.md for full architecture context.

## Don't

- Don't use `any` types — strict TypeScript throughout.
- Don't commit secrets or credentials to git.
- Don't use `--force` flags — fix the underlying issue instead.
- Don't skip pre-commit hooks with `--no-verify`.

## Compact Instructions

When compacting, preserve: list of modified files, current test status, open TODOs, and key decisions made.
