/**
 * Minimal process polyfill for browser environments
 * This shim provides the minimal process API needed for libraries that check for Node.js
 */

// Create a minimal process object if it doesn't exist
export const process = globalThis.process || {
  env: { NODE_ENV: 'development' },
  platform: 'browser',
  version: 'v18.0.0',
  versions: {},
  argv: [],
  cwd: () => '/',
  nextTick: (cb) => Promise.resolve().then(cb),
  browser: true,
};

// Expose globally for legacy code
if (typeof globalThis.process === 'undefined') {
  globalThis.process = process;
}
