# Release Checklist for proof-of-thought

This comprehensive checklist guides you through publishing a new version of `@michaelvanlaar/proof-of-thought` to npm.

## Pre-Release Checklist

### 1. Code Quality & Testing

- [ ] All tests passing: `npm test`
- [ ] Test coverage acceptable: `npm run test:coverage` (target: >80%)
- [ ] No linting errors: `npm run lint`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Format check passes: `npm run format:check`
- [ ] Full CI validation passes: `npm run ci`
- [ ] Security audit clean: `npm audit` (or acceptable vulnerabilities documented)

### 2. Build Verification

- [ ] Clean build succeeds: `npm run clean && npm run build`
- [ ] All build targets created:
  - [ ] `dist/index.js` (ESM)
  - [ ] `dist/index.cjs` (CommonJS)
  - [ ] `dist/index.d.ts` (TypeScript types)
  - [ ] `dist/browser.js` (Browser dev)
  - [ ] `dist/browser.min.js` (Browser prod)
- [ ] Bundle sizes acceptable (check `dist/` folder)
- [ ] No build warnings or errors

### 3. Version Determination

Use [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** (x.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, backward compatible

**Examples:**
- Bug fix: `0.1.0` → `0.1.1`
- New feature: `0.1.0` → `0.2.0`
- Breaking change: `0.1.0` → `1.0.0`

Determined version for this release: `_______`

## Documentation Updates

### 4. Update RELEASE_NOTES.md

- [ ] Add new version section at the top of `RELEASE_NOTES.md`
- [ ] Include version number and date
- [ ] Document all changes:
  - [ ] **Breaking Changes** (if any) - mark with ⚠️
  - [ ] **New Features** - mark with ✨
  - [ ] **Bug Fixes** - mark with 🐛
  - [ ] **Performance Improvements** - mark with ⚡
  - [ ] **Documentation** - mark with 📝
  - [ ] **Dependencies** - mark with 📦
- [ ] Use conventional commits format with gitmoji
- [ ] Reference related issues/PRs where applicable

**Format example:**
```markdown
## v0.2.0 (2026-01-21)

### ✨ New Features

- Add support for custom Z3 solver configurations
- Implement streaming API for long-running queries

### 🐛 Bug Fixes

- Fix memory leak in WASM adapter (#123)
- Correct type inference for complex formulas

### 📝 Documentation

- Add advanced usage guide
- Update API documentation for new features
```

### 5. Update README.md (if needed)

- [ ] Update version badge if present
- [ ] Add any new features to feature list
- [ ] Update examples if API changed
- [ ] Verify all links still work
- [ ] Update benchmarks/performance numbers if changed

### 6. Commit Documentation Changes

**IMPORTANT: Do this BEFORE version bump!**

- [ ] Stage documentation changes: `git add RELEASE_NOTES.md README.md`
- [ ] Commit with conventional format:
  ```bash
  git commit -m "📝 docs: update release notes for vX.Y.Z

  Prepare release vX.Y.Z with changelog and updated documentation.

  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
  ```

## Version Bump & Tagging

### 7. Bump Version

**IMPORTANT:** `npm version` automatically:
1. Updates `package.json` and `package-lock.json`
2. Creates a git commit
3. Creates a git tag

Choose the appropriate command:

- [ ] Patch release: `npm version patch`
- [ ] Minor release: `npm version minor`
- [ ] Major release: `npm version major`

Or specify exact version:
- [ ] Custom version: `npm version X.Y.Z`

**Note:** This creates a commit with message "X.Y.Z" and tag "vX.Y.Z"

## Testing & QA

### 8. Final Pre-Publish Testing

- [ ] Install locally: `npm pack` then `npm install -g michaelvanlaar-proof-of-thought-X.Y.Z.tgz`
- [ ] Test basic functionality:
  ```typescript
  import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';
  // Run a simple test query
  ```
- [ ] Test browser build (if applicable):
  - [ ] Check `examples/browser/` still works
  - [ ] Verify WASM loading in browser
- [ ] Test TypeScript types work correctly
- [ ] Verify tree-shaking works (check bundle size in a test app)

### 9. Review Package Contents

- [ ] Check what will be published: `npm pack --dry-run`
- [ ] Verify `.npmignore` or `files` in `package.json` is correct
- [ ] Ensure no sensitive files included (`.env`, credentials, etc.)
- [ ] Confirm all necessary files included (dist/, README.md, LICENSE, etc.)

## Publishing

### 10. Publish to npm

**IMPORTANT:** The `prepublishOnly` script runs automatically:
- `npm run clean` - Cleans dist folder
- `npm run build` - Builds all targets
- `npm run test` - Runs full test suite

If `prepublishOnly` fails, **publishing is aborted**.

- [ ] Dry run first (recommended): `npm publish --dry-run`
- [ ] Review dry run output
- [ ] **Publish for real**: `npm publish`
- [ ] Verify package appears on npm: https://www.npmjs.com/package/@michaelvanlaar/proof-of-thought

**For scoped packages:** If this is the first publish or you need to change access:
- [ ] Public publish: `npm publish --access public`

### 11. Push to GitHub

- [ ] Push commits: `git push`
- [ ] Push tags: `git push --tags`
- [ ] Verify commits and tags appear on GitHub

### 12. Create GitHub Release

**Option A: Using GitHub CLI (gh)**

```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes "$(cat <<'EOF'
## ✨ New Features
- Feature 1
- Feature 2

## 🐛 Bug Fixes
- Fix 1
- Fix 2

## 📝 Documentation
- Doc update 1

**Full Changelog**: https://github.com/MichaelvanLaar/proof-of-thought/compare/vX.Y.Z-1...vX.Y.Z
EOF
)"
```

**Option B: Using GitHub Web Interface**

- [ ] Go to https://github.com/MichaelvanLaar/proof-of-thought/releases/new
- [ ] Select tag: `vX.Y.Z`
- [ ] Release title: `vX.Y.Z`
- [ ] Copy release notes from `RELEASE_NOTES.md` (use same content)
- [ ] Mark as pre-release if beta/alpha
- [ ] Publish release

**Checklist:**
- [ ] Release created on GitHub
- [ ] Release notes match `RELEASE_NOTES.md`
- [ ] Tag is correct
- [ ] Release is marked correctly (pre-release vs. stable)

## Post-Release Verification

### 13. Verify Release

- [ ] Package available on npm: `npm info @michaelvanlaar/proof-of-thought`
- [ ] Correct version shown: `npm view @michaelvanlaar/proof-of-thought version`
- [ ] Package can be installed: `npm install @michaelvanlaar/proof-of-thought@X.Y.Z`
- [ ] GitHub release visible: https://github.com/MichaelvanLaar/proof-of-thought/releases
- [ ] Git tag created: `git tag -l`

### 14. Test Installation

In a clean directory:

```bash
mkdir test-install && cd test-install
npm init -y
npm install @michaelvanlaar/proof-of-thought@X.Y.Z
node -e "console.log(require('@michaelvanlaar/proof-of-thought'))"
```

- [ ] Package installs without errors
- [ ] Package can be imported/required
- [ ] TypeScript types work (if applicable)

### 15. Announcement (Optional)

- [ ] Update project README.md with latest version info
- [ ] Post announcement in GitHub Discussions
- [ ] Share on relevant communities (Reddit, Twitter, Discord, etc.)
- [ ] Update any related documentation sites

## Rollback Procedure (If Needed)

If critical issues are found after publishing:

### Option 1: Deprecate and Publish Fix

**Recommended for non-critical issues**

1. [ ] Deprecate the broken version:
   ```bash
   npm deprecate @michaelvanlaar/proof-of-thought@X.Y.Z "Critical bug, please upgrade to X.Y.Z+1"
   ```
2. [ ] Fix the issue
3. [ ] Publish a new patch version (X.Y.Z+1)
4. [ ] Update GitHub release notes

### Option 2: Unpublish (Only within 72 hours)

**⚠️ CAUTION: Only for critical security issues or if package was just published**

npm's policy allows unpublishing only within 72 hours of publishing.

1. [ ] Unpublish the version:
   ```bash
   npm unpublish @michaelvanlaar/proof-of-thought@X.Y.Z
   ```
2. [ ] Delete the Git tag:
   ```bash
   git tag -d vX.Y.Z
   git push origin :refs/tags/vX.Y.Z
   ```
3. [ ] Delete the GitHub release
4. [ ] Fix the issue
5. [ ] Restart the release process

**Note:** Unpublishing is discouraged by npm and should only be used in extreme cases.

## Quick Reference Commands

```bash
# Pre-release validation
npm run ci                          # Full CI check (lint, typecheck, test, build)
npm audit                           # Security audit
npm run test:coverage              # Check test coverage

# Documentation
# 1. Update RELEASE_NOTES.md manually
# 2. Commit documentation changes
git add RELEASE_NOTES.md README.md
git commit -m "📝 docs: update release notes for vX.Y.Z"

# Version bump (choose one)
npm version patch                   # 0.1.0 → 0.1.1
npm version minor                   # 0.1.0 → 0.2.0
npm version major                   # 0.1.0 → 1.0.0
npm version X.Y.Z                   # Specific version

# Publish
npm publish --dry-run              # Dry run first!
npm publish                         # Publish for real
npm publish --access public        # For scoped packages (first publish)

# Push to GitHub
git push && git push --tags        # Push commits and tags

# Create GitHub release
gh release create vX.Y.Z --title "vX.Y.Z" --notes "Release notes here"

# Verify
npm info @michaelvanlaar/proof-of-thought
npm view @michaelvanlaar/proof-of-thought version
```

## Common Issues & Solutions

### prepublishOnly fails

**Problem:** `npm publish` aborts because tests fail or build errors

**Solution:**
1. Fix the issue locally
2. Run `npm run ci` to verify everything passes
3. Commit the fix
4. If version was already bumped, you may need to re-run `npm version`
5. Try publishing again

### Wrong version published

**Problem:** Published wrong version number

**Solution:**
1. If within 72 hours: `npm unpublish @michaelvanlaar/proof-of-thought@X.Y.Z`
2. Otherwise: Deprecate and publish correct version

### Forgot to update RELEASE_NOTES.md

**Problem:** Published without updating release notes

**Solution:**
1. Update `RELEASE_NOTES.md`
2. Commit changes
3. Update the GitHub release notes manually
4. No need to republish package

### Git tag already exists

**Problem:** `npm version` fails because tag exists

**Solution:**
```bash
git tag -d vX.Y.Z                  # Delete local tag
git push origin :refs/tags/vX.Y.Z  # Delete remote tag
npm version X.Y.Z                  # Try again
```

## Notes

- Always run `npm run ci` before starting the release process
- Always update `RELEASE_NOTES.md` BEFORE running `npm version`
- The `npm version` command automatically creates a commit and tag
- The `prepublishOnly` script ensures the package is tested before publishing
- Always use the same changelog text in both `RELEASE_NOTES.md` and GitHub release
- Use conventional commits and gitmoji for all commit messages
- Consider using `--dry-run` flags to preview actions before executing them
