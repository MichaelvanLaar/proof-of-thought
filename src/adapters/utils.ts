/**
 * Utility functions for environment detection and Z3 adapter selection
 */

import type { Z3Adapter } from '../types/index.js';

/**
 * Runtime environment type
 */
export type RuntimeEnvironment = 'node' | 'browser' | 'unknown';

/**
 * Detect the current runtime environment
 */
export function detectEnvironment(): RuntimeEnvironment {
  // Check for Node.js
  if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    return 'node';
  }

  // Check for browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }

  return 'unknown';
}

/**
 * Check if running in Node.js
 */
export function isNode(): boolean {
  return detectEnvironment() === 'node';
}

/**
 * Check if running in browser
 */
export function isBrowser(): boolean {
  return detectEnvironment() === 'browser';
}

/**
 * Create appropriate Z3 adapter for current environment
 *
 * @param config - Configuration options
 * @returns Z3 adapter instance for the current environment
 */
export async function createZ3Adapter(config?: {
  timeout?: number;
  z3Path?: string;
}): Promise<Z3Adapter> {
  const env = detectEnvironment();

  switch (env) {
    case 'node': {
      const { Z3NativeAdapter } = await import('./z3-native.js');
      return new Z3NativeAdapter(config);
    }
    case 'browser': {
      const { Z3WASMAdapter } = await import('./z3-wasm.js');
      return new Z3WASMAdapter();
    }
    default: {
      // Default to native adapter and let it fail if not available
      const { Z3NativeAdapter } = await import('./z3-native.js');
      return new Z3NativeAdapter(config);
    }
  }
}

/**
 * Validate Z3 version meets minimum requirements
 *
 * @param version - Version string (e.g., "4.12.5")
 * @param minVersion - Minimum required version (e.g., "4.8.0")
 * @returns true if version meets requirements
 */
export function validateZ3Version(version: string, minVersion = '4.8.0'): boolean {
  const parseVersion = (v: string): number[] => {
    return v.split('.').map((n) => parseInt(n, 10) || 0);
  };

  const current = parseVersion(version);
  const minimum = parseVersion(minVersion);

  for (let i = 0; i < Math.max(current.length, minimum.length); i++) {
    const c = current[i] ?? 0;
    const m = minimum[i] ?? 0;

    if (c > m) {
      return true;
    }
    if (c < m) {
      return false;
    }
  }

  return true; // Versions are equal
}

/**
 * Get recommended Z3 installation instructions for current platform
 */
export function getZ3InstallationInstructions(): string {
  const platform = detectEnvironment();

  if (platform === 'node') {
    const os = typeof process !== 'undefined' ? process.platform : 'unknown';

    switch (os) {
      case 'darwin':
        return `Install Z3 on macOS:
  1. Using Homebrew: brew install z3
  2. Or install z3-solver package: npm install z3-solver`;

      case 'linux':
        return `Install Z3 on Linux:
  1. Using apt: sudo apt-get install z3
  2. Using yum: sudo yum install z3
  3. Or install z3-solver package: npm install z3-solver`;

      case 'win32':
        return `Install Z3 on Windows:
  1. Download from https://github.com/Z3Prover/z3/releases
  2. Add z3.exe to PATH
  3. Or install z3-solver package: npm install z3-solver`;

      default:
        return `Install Z3:
  1. Download from https://github.com/Z3Prover/z3/releases
  2. Or install z3-solver package: npm install z3-solver`;
    }
  }

  if (platform === 'browser') {
    return 'Z3 WASM bindings are loaded automatically in browser environments';
  }

  return 'Unknown environment. Please ensure Z3 is installed and available.';
}
