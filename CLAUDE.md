<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript port of [ProofOfThought](https://github.com/DebarghaG/proofofthought), implementing the neurosymbolic program synthesis approach described in the paper "Proof of Thought: Neurosymbolic Program Synthesis allows Robust and Interpretable Reasoning."

The goal is to provide the same functionality as the original Python implementation but for the Node.js/TypeScript ecosystem.

## Project Status

This is a new repository. The TypeScript implementation has not yet been started. When implementing:

1. Study the original Python implementation at https://github.com/DebarghaG/proofofthought to understand the architecture
2. Maintain API compatibility where reasonable while following TypeScript/Node.js conventions
3. The package should be usable in both Node.js and browser environments where possible

## GitHub Integration

This repository uses Claude Code GitHub Actions:

- **@claude trigger**: The `claude.yml` workflow responds to `@claude` mentions in issues, PRs, and comments
- **PR Reviews**: The `claude-code-review.yml` workflow automatically reviews pull requests for code quality, bugs, performance, security, and test coverage

When working on PRs, ensure changes align with the review criteria defined in the workflows.

## Original Python Reference

The original implementation should be consulted for:

- Algorithm design and neurosymbolic reasoning approach
- API surface and expected functionality
- Test cases and expected behavior

The TypeScript port should maintain conceptual compatibility while adopting TypeScript idioms and type safety.

## Publishing

**IMPORTANT:** When ready to publish a new version, use the comprehensive release checklist:

**See: `.claude/release-checklist.md`**

This checklist covers the complete release workflow including:

- Pre-release verification (tests, linting, build, security audit, coverage)
- Version determination (semantic versioning guide)
- Documentation updates (CHANGELOG.md, RELEASE_NOTES.md, README.md if needed)
- Testing & QA (unit tests, coverage, browser testing, local installation testing)
- Publishing to npm (with prepublishOnly hooks: clean + build + test)
- GitHub release creation
- Post-release verification
- Rollback procedures (if needed)

**Quick Reference Workflow:**

1. **Update CHANGELOG.md** - Move items from [Unreleased] to new version section (follows Keep a Changelog format: Added/Changed/Fixed/etc.)
2. **Update RELEASE_NOTES.md** - Add detailed release notes with examples and usage information
3. **Update README.md** - If needed (version badge, feature list, examples, benchmarks)
4. **Commit documentation changes** - Commit CHANGELOG.md, RELEASE_NOTES.md, and README.md BEFORE bumping version
5. **Bump version** - Use `npm version patch|minor|major` (this updates package.json, package-lock.json, and creates a git commit + tag automatically)
6. **Publish to npm** - Run `npm publish --dry-run` first, then `npm publish` (this runs prepublishOnly hook: clean + build + test)
7. **Push to GitHub** - Run `git push && git push --tags` to push commits and the version tag
8. **Create GitHub release** - Use `gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."` with the same content from RELEASE_NOTES.md

**Files that must be updated:**

- `CHANGELOG.md` - Move [Unreleased] items to new version section, update comparison links (do this FIRST, before version bump)
- `RELEASE_NOTES.md` - Add detailed version section at top with examples (do this FIRST, before version bump)
- `README.md` - Update if needed (version badge, features, examples, benchmarks)
- `package.json` and `package-lock.json` - Automatically updated by `npm version`

**Build Targets:**

This package builds multiple formats:
- Node.js ESM (`dist/index.js`)
- Node.js CommonJS (`dist/index.cjs`)
- TypeScript types (`dist/index.d.ts`)
- Browser development (`dist/browser.js`)
- Browser production (`dist/browser.min.js`)

All builds are automatically created by `npm run build` and verified by the `prepublishOnly` hook.

**Note:**

- The `npm version` command automatically creates a git commit and tag, so commit CHANGELOG.md and RELEASE_NOTES.md changes BEFORE running it
- `CHANGELOG.md` follows the Keep a Changelog format with categories: Added, Changed, Deprecated, Removed, Fixed, Security
- `RELEASE_NOTES.md` provides more detailed release notes with examples and usage information
- GitHub release notes should match the content from `RELEASE_NOTES.md`
- The `prepublishOnly` hook (`npm run clean && npm run build && npm run test`) runs automatically before publishing and will abort if any step fails
- Use conventional commits and gitmoji for all commit messages

```bash
npm run ci                 # Full validation (lint + typecheck + test:coverage + build)
npm run prepublishOnly     # Runs before publishing (clean + build + test)
```

## Notes

- Always use Conventional Commits and gitmoji when creating git commit messages.
