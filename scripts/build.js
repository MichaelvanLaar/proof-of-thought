#!/usr/bin/env node

import { build } from 'esbuild';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

const sharedConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  sourcemap: true,
  minify: false,
  metafile: true,
};

async function buildAll() {
  console.log('🏗️  Building @proof-of-thought/core...\n');

  try {
    // Build ESM
    console.log('📦 Building ESM bundle...');
    await build({
      ...sharedConfig,
      format: 'esm',
      outfile: 'dist/index.js',
    });
    console.log('✅ ESM bundle complete\n');

    // Build CJS
    console.log('📦 Building CJS bundle...');
    await build({
      ...sharedConfig,
      format: 'cjs',
      outfile: 'dist/index.cjs',
    });
    console.log('✅ CJS bundle complete\n');

    // Build Backend exports
    console.log('📦 Building backends bundle...');
    await build({
      ...sharedConfig,
      entryPoints: ['src/backends/index.ts'],
      format: 'esm',
      outfile: 'dist/backends/index.js',
    });
    await build({
      ...sharedConfig,
      entryPoints: ['src/backends/index.ts'],
      format: 'cjs',
      outfile: 'dist/backends/index.cjs',
    });
    console.log('✅ Backends bundle complete\n');

    // Build Browser bundle with WASM adapter
    console.log('📦 Building browser bundle...');
    await build({
      entryPoints: ['src/browser.ts'],
      bundle: true,
      platform: 'browser',
      target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
      format: 'esm',
      outfile: 'dist/browser.js',
      external: ['openai'], // Let bundlers handle OpenAI SDK
      sourcemap: true,
      minify: false,
      metafile: true,
    });
    console.log('✅ Browser bundle complete\n');

    console.log('✨ All builds completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();
