/**
 * Tests for adapter utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  detectEnvironment,
  isNode,
  isBrowser,
  validateZ3Version,
  getZ3InstallationInstructions,
  createZ3Adapter,
} from '../../src/adapters/utils.js';

describe('Environment Detection', () => {
  it('should detect Node.js environment', () => {
    const env = detectEnvironment();
    expect(env).toBe('node');
  });

  it('should return true for isNode()', () => {
    expect(isNode()).toBe(true);
  });

  it('should return false for isBrowser()', () => {
    expect(isBrowser()).toBe(false);
  });

  it('should create Z3 adapter in Node.js (native or WASM fallback)', async () => {
    const adapter = await createZ3Adapter();
    expect(adapter).toBeDefined();
    // Should be either native or WASM depending on what's available
    expect(['Z3NativeAdapter', 'Z3WASMAdapter']).toContain(
      adapter.constructor.name
    );
  });
});

describe('Z3 Version Validation', () => {
  it('should validate version correctly', () => {
    expect(validateZ3Version('4.12.5', '4.8.0')).toBe(true);
    expect(validateZ3Version('4.12.5', '4.12.5')).toBe(true);
    expect(validateZ3Version('4.7.0', '4.8.0')).toBe(false);
    expect(validateZ3Version('5.0.0', '4.8.0')).toBe(true);
  });

  it('should handle version strings with different lengths', () => {
    expect(validateZ3Version('4.12', '4.8.0')).toBe(true);
    expect(validateZ3Version('4.8.0', '4.8')).toBe(true);
    expect(validateZ3Version('4', '4.8.0')).toBe(false);
  });

  it('should use default minimum version', () => {
    expect(validateZ3Version('4.12.5')).toBe(true);
    expect(validateZ3Version('4.7.0')).toBe(false);
  });
});

describe('Installation Instructions', () => {
  it('should return installation instructions', () => {
    const instructions = getZ3InstallationInstructions();
    expect(instructions).toBeTruthy();
    expect(instructions.length).toBeGreaterThan(0);
    expect(instructions).toContain('Z3');
  });

  it('should include platform-specific information', () => {
    const instructions = getZ3InstallationInstructions();
    // Should mention at least one installation method
    expect(
      instructions.includes('brew') ||
        instructions.includes('apt') ||
        instructions.includes('npm') ||
        instructions.includes('download')
    ).toBe(true);
  });
});
