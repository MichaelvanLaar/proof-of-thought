# Key Config Files

| File                                       | Purpose                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `.claude/config-files.md`                  | Reference table of key config files and their purposes                     |
| `.claude/release-checklist.md`             | Release process checklist                                                  |
| `.claude/settings.json`                    | Claude Code permissions, post-edit hooks (Prettier + JSON/YAML validation) |
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
