# Project Overview

@AGENTS.md

## File Conventions

Primary file types in this project: YAML (CI/CD configs), JSON (settings/config), Markdown (documentation). When editing these, preserve existing formatting and indentation conventions.

### Key Config Files

| File                                       | Purpose                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `.claude/release-checklist.md`             | Release process checklist                                                  |
| `.claude/settings.json`                    | Claude Code permissions, post-edit hooks (Prettier + JSON/YAML validation) |
| `.claude/settings.local.json`              | Local Claude Code overrides (gitignored)                                   |
| `.github/workflows/claude-code-review.yml` | Automatic PR review by Claude                                              |
| `.github/workflows/claude.yml`             | Claude automation via `@claude` in issues/PRs                              |
| `.github/workflows/lint.yml`               | ESLint on push to main/develop/claude                                      |
| `.github/workflows/release.yml`            | NPM publish on git tag push                                                |
| `.github/workflows/test.yml`               | Vitest on push to main/develop/claude                                      |
| `.gitignore`                               | Ignores deps, dist, IDE files, Z3 WASM artifacts                           |
| `.mcp.json`                                | MCP server config — Context7 docs via Upstash                              |
| `.npmignore`                               | Excludes source, configs, tests from npm publish                           |
| `.prettierignore`                          | Prettier ignore patterns for node_modules, dist, and coverage              |
| `.prettierrc.json`                         | Prettier — 100 char width, single quotes, trailing commas                  |
| `eslint.config.js`                         | ESLint with TypeScript + Prettier integration                              |
| `package.json`                             | Package metadata, dependencies, scripts, exports                           |
| `tsconfig.json`                            | TypeScript compiler — strict mode, ES2022 target                           |
| `vitest.config.ts`                         | Vitest — V8 coverage, 80% thresholds, timeouts                             |

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
@openspec/project.md for full architecture context.

## Git Workflow

For commits, use descriptive multi-line commit messages that summarize all changed files. Always check for unstaged changes before committing.

## Don't

- Don't use `any` types — strict TypeScript throughout.
- Don't commit secrets or credentials to git.
- Don't use `--force` flags — fix the underlying issue instead.
- Don't skip pre-commit hooks with `--no-verify`.

## Compact Instructions

When compacting, preserve: list of modified files, current test status, open TODOs, and key decisions made.
