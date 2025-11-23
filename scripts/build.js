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

    // Build Browser bundle with WASM adapter (Development)
    console.log('📦 Building browser bundle (development)...');
    const browserDevResult = await build({
      entryPoints: ['src/browser.ts'],
      bundle: true,
      platform: 'browser',
      target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
      format: 'esm',
      outfile: 'dist/browser.js',
      external: [
        'openai', // Let bundlers handle OpenAI SDK
        'child_process', // Node.js built-in, not available in browser
        'z3-solver', // Native Z3 package, only used in Node.js
      ],
      sourcemap: true,
      minify: false,
      metafile: true,
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    });
    console.log('✅ Browser bundle (development) complete');
    console.log(`   Size: ${(browserDevResult.metafile.outputs['dist/browser.js'].bytes / 1024).toFixed(2)} KB\n`);

    // Build Browser bundle (Production - Minified)
    console.log('📦 Building browser bundle (production)...');
    const browserProdResult = await build({
      entryPoints: ['src/browser.ts'],
      bundle: true,
      platform: 'browser',
      target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
      format: 'esm',
      outfile: 'dist/browser.min.js',
      external: [
        'openai',
        'child_process', // Node.js built-in, not available in browser
        'z3-solver', // Native Z3 package, only used in Node.js
      ],
      sourcemap: true,
      minify: true,
      minifyWhitespace: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      metafile: true,
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      legalComments: 'none',
      charset: 'utf8',
    });
    console.log('✅ Browser bundle (production) complete');
    console.log(`   Size: ${(browserProdResult.metafile.outputs['dist/browser.min.js'].bytes / 1024).toFixed(2)} KB\n`);

    console.log('✨ All builds completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();
