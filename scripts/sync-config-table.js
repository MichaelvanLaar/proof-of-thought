#!/usr/bin/env node
/**
 * Keeps the "Key Config Files" table in CLAUDE.md in sync with the filesystem.
 * - Removes rows for files that no longer exist
 * - Appends rows for new config files with a placeholder description
 * - Excludes gitignored files (they are per-machine, not part of the committed state)
 * Preserves all existing hand-written descriptions.
 * Invoked automatically by the pre-commit hook.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const CLAUDE_MD = join(ROOT, 'CLAUDE.md');

// Root-level entries that are not config files
const ROOT_EXCLUDE = new Set([
  'package-lock.json',
  'README.md',
  'CHANGELOG.md',
  'AGENTS.md',
  'CLAUDE.md',
  'LICENSE',
]);

// Root-level directories to skip entirely
const ROOT_SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'src',
  'tests',
  'benchmarks',
  'openspec',
  '.git',
  '.husky',
  'coverage',
  'scripts',
  '.claude',
  '.github',
]);

// Extensions that identify a root-level config file
const CONFIG_EXTS = new Set(['.json', '.js', '.ts', '.yaml', '.yml']);

// Dotfiles that are config files regardless of extension
const CONFIG_DOTFILES = new Set([
  '.gitignore',
  '.npmignore',
  '.prettierignore',
  '.editorconfig',
  '.nvmrc',
  '.node-version',
]);

/**
 * Check whether a path is gitignored.
 * `git check-ignore -q` exits 0 if ignored, 1 if tracked/untracked-but-not-ignored.
 * execSync throws on non-zero exit, so we catch and return false.
 */
function isGitignored(file) {
  try {
    execSync(`git check-ignore -q -- "${file}"`, { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function scanConfigFiles() {
  const files = [];

  // Root-level config files
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const { name } = entry;
    if (ROOT_EXCLUDE.has(name)) continue;
    if (ROOT_SKIP_DIRS.has(name)) continue;
    if (name.startsWith('.')) {
      if (!CONFIG_DOTFILES.has(name) && !CONFIG_EXTS.has(`.${name.split('.').pop()}`)) continue;
    } else {
      const ext = name.includes('.') ? `.${name.split('.').pop()}` : '';
      if (!CONFIG_EXTS.has(ext)) continue;
    }
    files.push(name);
  }

  // .claude/ direct children only (skip skills/ subdir)
  const claudeDir = join(ROOT, '.claude');
  if (existsSync(claudeDir)) {
    for (const entry of readdirSync(claudeDir, { withFileTypes: true })) {
      if (entry.isFile()) files.push(`.claude/${entry.name}`);
    }
  }

  // .github/workflows/
  const workflowsDir = join(ROOT, '.github/workflows');
  if (existsSync(workflowsDir)) {
    for (const entry of readdirSync(workflowsDir, { withFileTypes: true })) {
      if (entry.isFile()) files.push(`.github/workflows/${entry.name}`);
    }
  }

  // Filter out gitignored files (per-machine / personal files don't belong
  // in the committed config table — they may not exist on other clones).
  return files.filter((f) => !isGitignored(f)).sort();
}

function parseExistingDescriptions(content) {
  const map = new Map();
  const sectionStart = content.indexOf('### Key Config Files');
  if (sectionStart === -1) return map;
  const section = content.slice(sectionStart);
  // Match Prettier-aligned table rows: | `file` | description |
  const rowRegex = /\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|/g;
  let match;
  while ((match = rowRegex.exec(section)) !== null) {
    const [, file, desc] = match;
    if (file === 'File') continue; // skip header
    map.set(file, desc.trim());
  }
  return map;
}

function buildTable(rows) {
  return [
    '| File | Purpose |',
    '|------|---------|',
    ...rows.map(([file, desc]) => `| \`${file}\` | ${desc} |`),
  ].join('\n');
}

function sync() {
  const content = readFileSync(CLAUDE_MD, 'utf8');
  const existing = parseExistingDescriptions(content);
  const scanned = scanConfigFiles();

  const updated = scanned.map((file) => [file, existing.get(file) ?? 'TODO: add description']);

  // Replace table block (consecutive | lines after the section heading)
  const newTable = buildTable(updated);
  const newContent = content.replace(
    /(### Key Config Files\n\n)((?:\|[^\n]*\n)+)/,
    `$1${newTable}\n`
  );

  if (newContent === content) {
    process.stdout.write('sync-config-table: no changes\n');
    return;
  }

  writeFileSync(CLAUDE_MD, newContent);
  process.stdout.write('sync-config-table: updated CLAUDE.md\n');
  execSync('git add CLAUDE.md', { cwd: ROOT });
}

sync();
