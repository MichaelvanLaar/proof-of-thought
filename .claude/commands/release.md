You are guiding an interactive release of the `@michaelvanlaar/proof-of-thought` npm package. Pushing the version tag triggers `.github/workflows/release.yml`, which runs CI, publishes to npm via OIDC (Trusted Publishers — no token needed), and creates the GitHub release automatically.

**Prerequisite (one-time setup):** The npm package must have GitHub configured as a Trusted Publisher on npmjs.com (Package → Settings → Trusted Publishers → GitHub Actions, repo: `MichaelvanLaar/proof-of-thought`, workflow: `release.yml`).

## Arguments

Version bump type passed by user: `$ARGUMENTS`

Valid values: `patch`, `minor`, `major`, or an exact version like `1.2.3`.
If no argument was provided, ask the user which type to use before proceeding.

---

## Step 1 — Pre-Release Checks

Run all checks and report results:

```bash
npm run ci
npm audit --audit-level=high
```

If `npm run ci` fails, stop and report what failed. Do not continue until the user confirms issues are resolved.
If `npm audit` shows high/critical vulnerabilities, report them and ask whether to proceed.

---

## Step 2 — Review Unreleased Changes

Read `CHANGELOG.md` and show the user what's in `[Unreleased]`. Ask them to confirm:
- Is the requested version bump type appropriate for these changes?
- Are there any changes missing from the changelog?

---

## Step 3 — Determine New Version

Read the current version from `package.json`.

**First release check:** Run `git tag -l 'v*'`. If no version tags exist yet, this is the first release. In that case:
- Confirm with the user that the current version (e.g. `0.1.0`) will be released as-is without a version bump
- Skip to Step 4 (no `npm version` command needed — just a direct git tag)

Otherwise, calculate and display the new version resulting from the requested bump. Confirm with the user before proceeding.

---

## Step 4 — Update CHANGELOG.md

Edit `CHANGELOG.md`:
1. Replace `## [Unreleased]` with `## [X.Y.Z] - YYYY-MM-DD` (use today's date from the `currentDate` context)
2. Add a new `## [Unreleased]` section at the top with empty placeholder content
3. Update the comparison links at the bottom:
   - Update `[unreleased]` to compare new version against HEAD
   - Add new version comparison link
   - Keep existing links

Show the user a diff and confirm before proceeding.

---

## Step 5 — Update RELEASE_NOTES.md

**Important:** The GitHub Actions workflow extracts release notes by looking for a `## vX.Y.Z` section header. Every version section must start with this exact format.

Read `RELEASE_NOTES.md`. Add a new section at the very top in this format:

```markdown
## vX.Y.Z (YYYY-MM-DD)

### ✨ New Features
- ...

### 🐛 Bug Fixes
- ...

### ♻️ Changes
- ...
```

Only include categories that have entries. Derive content from the CHANGELOG.md section you just wrote. You may add more detail than the changelog.

For the **first release** (v0.1.0): add `## v0.1.0 (YYYY-MM-DD)` as a new first line above the existing content, so the awk extraction in the workflow can find it.

Show the user a diff and confirm before proceeding.

---

## Step 6 — Update README.md (if needed)

Ask: "Does README.md need any updates for this release (e.g. new features, changed API)?"

If yes, help identify and make the updates. If no, skip.

---

## Step 7 — Commit Documentation Changes

Stage and commit BEFORE the version tag is created:

```bash
git add CHANGELOG.md RELEASE_NOTES.md
# Also add README.md if modified
git status
```

Commit with:
```bash
git commit -m "📝 docs: update changelog and release notes for vX.Y.Z

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

The pre-commit hook runs lint + test automatically. If it fails, stop and report the error.

---

## Step 8 — Create Version Tag

**For first release** (no existing tags):
```bash
git tag v0.1.0
```

**For all other releases:**
```bash
npm version patch   # or minor / major / X.Y.Z
```

`npm version` updates `package.json` and `package-lock.json`, creates commit "X.Y.Z", and creates tag "vX.Y.Z".

Confirm the tag was created:
```bash
git tag -l | tail -5
```

---

## Step 9 — First Release Only: Manual npm Publish + Trusted Publishers Setup

**Skip this step if version tags already existed before this release.**

The npm Trusted Publishers feature requires the package to already exist on npm. Since this is the first release, you must publish manually once, then configure Trusted Publishers so all future releases are automated.

Ask the user to confirm before running:

```bash
npm publish --access public
```

This runs `prepublishOnly` automatically (clean → build → test) before publishing.

Once the publish succeeds, instruct the user to:
1. Go to https://www.npmjs.com/package/@michaelvanlaar/proof-of-thought
2. Click **Settings** → **Publishing** → **Trusted Publishers**
3. Add GitHub as a trusted publisher:
   - **Repository owner**: `MichaelvanLaar`
   - **Repository name**: `proof-of-thought`
   - **Workflow filename**: `release.yml`
4. Confirm back here when done

Do not proceed to Step 10 until the user confirms Trusted Publishers is configured.

---

## Step 10 — Push to GitHub

**This triggers the GitHub Actions release workflow.** Confirm before running.

```bash
git push && git push --tags
```

This pushes the documentation commit, the version bump commit (if any), and the version tag that triggers `.github/workflows/release.yml`.

For the first release: GH Actions will try to publish to npm again. Since Trusted Publishers is now configured, it will succeed. The npm registry will simply update the package metadata (provenance attestation) — the package contents are already published from Step 9.

---

## Step 10 — Monitor GitHub Actions

Show the user the workflow run:
```bash
gh run list --limit 3
```

Then watch for completion:
```bash
gh run watch
```

The workflow:
1. Runs full CI validation (`npm run ci`)
2. Publishes to npm via OIDC (no token needed)
3. Extracts release notes from `RELEASE_NOTES.md`
4. Creates the GitHub release with those notes and attaches dist files

If the workflow fails, show the logs:
```bash
gh run view --log-failed
```

---

## Step 11 — Verify Release

Once the workflow succeeds, verify everything:

```bash
npm view @michaelvanlaar/proof-of-thought version
gh release view v$(node -p "require('./package.json').version")
```

Show the user:
- The npm version that's now live
- The GitHub release URL

---

## Step 12 — Test Installation (Optional)

Ask: "Would you like to test the installation from npm in a clean directory?"

If yes:
```bash
cd /tmp && mkdir test-pot && cd test-pot
npm init -y
npm install @michaelvanlaar/proof-of-thought@X.Y.Z
node -e "const p = require('@michaelvanlaar/proof-of-thought'); console.log('OK:', Object.keys(p))"
cd - && rm -rf /tmp/test-pot
```

---

## If Something Goes Wrong

### CI fails in GitHub Actions
Run `gh run view --log-failed` to see the error. Fix locally, commit, then delete and recreate the tag:
```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
# fix the issue, commit, then:
git tag vX.Y.Z
git push --tags
```

### npm publish fails (OIDC / Trusted Publishers not configured)
Go to npmjs.com → package → Settings → Trusted Publishers and add GitHub with repo `MichaelvanLaar/proof-of-thought` and workflow `release.yml`. Then re-trigger by deleting and recreating the tag.

### Need to rollback after publish
1. **Deprecate** (recommended): `npm deprecate @michaelvanlaar/proof-of-thought@X.Y.Z "Critical bug, please upgrade"`
2. **Unpublish** (only within 72h): `npm unpublish @michaelvanlaar/proof-of-thought@X.Y.Z`
3. **Delete tag**: `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`
4. **Delete GitHub release**: `gh release delete vX.Y.Z --yes`
5. Fix the issue and release a new patch version.
