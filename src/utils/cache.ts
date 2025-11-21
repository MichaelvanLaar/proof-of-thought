/**
 * Caching utilities for ProofOfThought
 *
 * Provides caching mechanisms for LLM responses, Z3 results, and formulas
 * to improve performance for repeated queries.
 *
 * @packageDocumentation
 */

import type { ReasoningResponse } from '../types/index.js';
import type { VerificationResult } from '../types/index.js';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /**
   * Maximum number of entries in cache
   * @default 1000
   */
  maxSize?: number;

  /**
   * Time to live for cache entries in milliseconds
   * @default 3600000 (1 hour)
   */
  ttl?: number;

  /**
   * Enable cache statistics tracking
   * @default true
   */
  enableStats?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

/**
 * Generic LRU cache with TTL support
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttl: number;
  private enableStats: boolean;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize || 1000;
    this.ttl = config.ttl || 3600000;  // 1 hour
    this.enableStats = config.enableStats !== false;
  }

  /**
   * Generate cache key from inputs
   */
  private generateKey(inputs: unknown[]): string {
    return JSON.stringify(inputs);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.enableStats) this.misses++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.enableStats) {
        this.misses++;
        this.evictions++;
      }
      return undefined;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);

    if (this.enableStats) this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        if (this.enableStats) this.evictions++;
      }
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      hits: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.enableStats) this.evictions++;
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      hitRate,
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (this.enableStats) {
      this.evictions += cleaned;
    }

    return cleaned;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
}

/**
 * Query cache for reasoning responses
 */
export class QueryCache {
  private cache: LRUCache<ReasoningResponse>;

  constructor(config: CacheConfig = {}) {
    this.cache = new LRUCache<ReasoningResponse>(config);
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(question: string, context: string, backend: string): string {
    return `query:${backend}:${question}:${context}`;
  }

  /**
   * Get cached query result
   */
  get(question: string, context: string, backend: string): ReasoningResponse | undefined {
    const key = this.getCacheKey(question, context, backend);
    return this.cache.get(key);
  }

  /**
   * Cache query result
   */
  set(question: string, context: string, backend: string, result: ReasoningResponse): void {
    const key = this.getCacheKey(question, context, backend);
    this.cache.set(key, result);
  }

  /**
   * Check if query is cached
   */
  has(question: string, context: string, backend: string): boolean {
    const key = this.getCacheKey(question, context, backend);
    return this.cache.has(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    return this.cache.cleanExpired();
  }
}

/**
 * Formula cache for translated formulas
 */
export class FormulaCache {
  private cache: LRUCache<string>;

  constructor(config: CacheConfig = {}) {
    this.cache = new LRUCache<string>(config);
  }

  /**
   * Generate cache key for formula translation
   */
  private getCacheKey(question: string, context: string, backend: string): string {
    return `formula:${backend}:${question}:${context}`;
  }

  /**
   * Get cached formula
   */
  get(question: string, context: string, backend: string): string | undefined {
    const key = this.getCacheKey(question, context, backend);
    return this.cache.get(key);
  }

  /**
   * Cache formula
   */
  set(question: string, context: string, backend: string, formula: string): void {
    const key = this.getCacheKey(question, context, backend);
    this.cache.set(key, formula);
  }

  /**
   * Check if formula is cached
   */
  has(question: string, context: string, backend: string): boolean {
    const key = this.getCacheKey(question, context, backend);
    return this.cache.has(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

/**
 * Z3 result cache for verification results
 */
export class Z3ResultCache {
  private cache: LRUCache<VerificationResult>;

  constructor(config: CacheConfig = {}) {
    this.cache = new LRUCache<VerificationResult>(config);
  }

  /**
   * Generate cache key for Z3 result
   */
  private getCacheKey(formula: string, backend: string): string {
    return `z3:${backend}:${formula}`;
  }

  /**
   * Get cached Z3 result
   */
  get(formula: string, backend: string): VerificationResult | undefined {
    const key = this.getCacheKey(formula, backend);
    return this.cache.get(key);
  }

  /**
   * Cache Z3 result
   */
  set(formula: string, backend: string, result: VerificationResult): void {
    const key = this.getCacheKey(formula, backend);
    this.cache.set(key, result);
  }

  /**
   * Check if Z3 result is cached
   */
  has(formula: string, backend: string): boolean {
    const key = this.getCacheKey(formula, backend);
    return this.cache.has(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

/**
 * Unified cache manager for all cache types
 */
export class CacheManager {
  private queryCache: QueryCache;
  private formulaCache: FormulaCache;
  private z3Cache: Z3ResultCache;

  constructor(config: CacheConfig = {}) {
    this.queryCache = new QueryCache(config);
    this.formulaCache = new FormulaCache(config);
    this.z3Cache = new Z3ResultCache(config);
  }

  /**
   * Get query cache
   */
  getQueryCache(): QueryCache {
    return this.queryCache;
  }

  /**
   * Get formula cache
   */
  getFormulaCache(): FormulaCache {
    return this.formulaCache;
  }

  /**
   * Get Z3 result cache
   */
  getZ3Cache(): Z3ResultCache {
    return this.z3Cache;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.queryCache.clear();
    this.formulaCache.clear();
    this.z3Cache.clear();
  }

  /**
   * Get combined statistics
   */
  getAllStats(): {
    query: CacheStats;
    formula: CacheStats;
    z3: CacheStats;
  } {
    return {
      query: this.queryCache.getStats(),
      formula: this.formulaCache.getStats(),
      z3: this.z3Cache.getStats(),
    };
  }

  /**
   * Clean expired entries in all caches
   */
  cleanAllExpired(): {
    query: number;
    formula: number;
    z3: number;
  } {
    return {
      query: this.queryCache.cleanExpired(),
      formula: this.formulaCache.cleanExpired(),
      z3: this.z3Cache.cleanExpired(),
    };
  }

  /**
   * Generate cache report
   */
  generateReport(): string {
    const stats = this.getAllStats();

    return `
=== Cache Report ===

Query Cache:
  Hits: ${stats.query.hits}
  Misses: ${stats.query.misses}
  Evictions: ${stats.query.evictions}
  Size: ${stats.query.size}
  Hit Rate: ${(stats.query.hitRate * 100).toFixed(1)}%

Formula Cache:
  Hits: ${stats.formula.hits}
  Misses: ${stats.formula.misses}
  Evictions: ${stats.formula.evictions}
  Size: ${stats.formula.size}
  Hit Rate: ${(stats.formula.hitRate * 100).toFixed(1)}%

Z3 Result Cache:
  Hits: ${stats.z3.hits}
  Misses: ${stats.z3.misses}
  Evictions: ${stats.z3.evictions}
  Size: ${stats.z3.size}
  Hit Rate: ${(stats.z3.hitRate * 100).toFixed(1)}%

Overall:
  Total Hits: ${stats.query.hits + stats.formula.hits + stats.z3.hits}
  Total Misses: ${stats.query.misses + stats.formula.misses + stats.z3.misses}
  Total Size: ${stats.query.size + stats.formula.size + stats.z3.size}
`;
  }
}

/**
 * Global cache manager instance
 */
let globalCacheManager: CacheManager | null = null;

/**
 * Get or create the global cache manager
 */
export function getGlobalCacheManager(): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager();
  }
  return globalCacheManager;
}

/**
 * Set the global cache manager
 */
export function setGlobalCacheManager(manager: CacheManager | null): void {
  globalCacheManager = manager;
}
