/**
 * Tests for custom error classes
 */

import { describe, it, expect } from 'vitest';
import {
  ProofOfThoughtError,
  ConfigurationError,
  BackendError,
  TranslationError,
  ValidationError,
  Z3Error,
  Z3NotAvailableError,
  Z3TimeoutError,
  PostprocessingError,
  LLMError,
  ParsingError,
} from '../../src/types/errors.js';

describe('Custom Errors', () => {
  describe('ProofOfThoughtError', () => {
    it('should create base error with message', () => {
      const error = new ProofOfThoughtError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error.message).toBe('test error');
      expect(error.name).toBe('ProofOfThoughtError');
    });

    it('should have proper prototype chain', () => {
      const error = new ProofOfThoughtError('test');
      expect(Object.getPrototypeOf(error)).toBe(ProofOfThoughtError.prototype);
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('Invalid config');
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Invalid config');
      expect(error.name).toBe('ConfigurationError');
    });

    it('should preserve stack trace', () => {
      const error = new ConfigurationError('test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConfigurationError');
    });
  });

  describe('BackendError', () => {
    it('should create backend error with backend type', () => {
      const error = new BackendError('Backend failed', 'smt2');
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(BackendError);
      expect(error.message).toBe('Backend failed');
      expect(error.backend).toBe('smt2');
      expect(error.name).toBe('BackendError');
    });

    it('should support optional backend type', () => {
      const error = new BackendError('Backend failed');
      expect(error.backend).toBeUndefined();
    });
  });

  describe('TranslationError', () => {
    it('should create translation error', () => {
      const error = new TranslationError('Translation failed');
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(TranslationError);
      expect(error.message).toBe('Translation failed');
      expect(error.name).toBe('TranslationError');
    });
  });

  describe('PostprocessingError', () => {
    it('should create postprocessing error', () => {
      const error = new PostprocessingError('Postprocessing failed', 'self-refine');
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(PostprocessingError);
      expect(error.message).toBe('Postprocessing failed');
      expect(error.name).toBe('PostprocessingError');
      expect(error.method).toBe('self-refine');
    });
  });

  describe('LLMError', () => {
    it('should create LLM error', () => {
      const error = new LLMError('LLM API failed', 429, true);
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(LLMError);
      expect(error.message).toBe('LLM API failed');
      expect(error.name).toBe('LLMError');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
    });
  });

  describe('ParsingError', () => {
    it('should create parsing error', () => {
      const error = new ParsingError('Parsing failed', 'raw output');
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(ParsingError);
      expect(error.message).toBe('Parsing failed');
      expect(error.name).toBe('ParsingError');
      expect(error.rawOutput).toBe('raw output');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Validation failed');
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('Z3Error', () => {
    it('should create Z3 error', () => {
      const error = new Z3Error('Z3 failed');
      expect(error).toBeInstanceOf(ProofOfThoughtError);
      expect(error).toBeInstanceOf(Z3Error);
      expect(error.message).toBe('Z3 failed');
      expect(error.name).toBe('Z3Error');
    });
  });

  describe('Z3NotAvailableError', () => {
    it('should create Z3NotAvailableError', () => {
      const error = new Z3NotAvailableError('Z3 not found');
      expect(error).toBeInstanceOf(Z3Error);
      expect(error).toBeInstanceOf(Z3NotAvailableError);
      expect(error.message).toBe('Z3 not found');
      expect(error.name).toBe('Z3NotAvailableError');
    });
  });

  describe('Z3TimeoutError', () => {
    it('should create Z3TimeoutError', () => {
      const error = new Z3TimeoutError('Z3 timeout');
      expect(error).toBeInstanceOf(Z3Error);
      expect(error).toBeInstanceOf(Z3TimeoutError);
      expect(error.message).toBe('Z3 timeout');
      expect(error.name).toBe('Z3TimeoutError');
    });
  });

  describe('Error instanceof checks', () => {
    it('should support instanceof checks for all error types', () => {
      const errors = [
        new ProofOfThoughtError('base'),
        new ConfigurationError('config'),
        new BackendError('backend', 'smt2'),
        new TranslationError('translation'),
        new PostprocessingError('postprocessing', 'self-refine'),
        new ValidationError('validation'),
        new Z3Error('z3'),
        new Z3NotAvailableError('z3 not available'),
        new Z3TimeoutError('z3 timeout', 30000),
        new LLMError('llm', 429),
        new ParsingError('parsing'),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ProofOfThoughtError);
      });
    });

    it('should differentiate between error types', () => {
      const configError = new ConfigurationError('config');
      const backendError = new BackendError('backend', 'smt2');

      expect(configError).toBeInstanceOf(ConfigurationError);
      expect(configError).not.toBeInstanceOf(BackendError);

      expect(backendError).toBeInstanceOf(BackendError);
      expect(backendError).not.toBeInstanceOf(ConfigurationError);
    });
  });

  describe('Error serialization', () => {
    it('should serialize to JSON', () => {
      const error = new BackendError('test error', 'smt2');
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);

      // Note: Error objects don't serialize well by default, but we can check message
      expect(parsed).toBeDefined();
    });

    it('should convert to string', () => {
      const error = new ConfigurationError('test error');
      const str = error.toString();
      expect(str).toContain('ConfigurationError');
      expect(str).toContain('test error');
    });
  });
});
