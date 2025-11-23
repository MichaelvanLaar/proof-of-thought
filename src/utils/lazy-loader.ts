/**
 * Lazy loading utilities for optional features
 *
 * Provides dynamic import mechanisms for backends, postprocessing methods,
 * and other optional features to reduce initial bundle size.
 *
 * @packageDocumentation
 */

/**
 * Lazy loaded module cache
 */
interface ModuleCache<T> {
  promise?: Promise<T>;
  module?: T;
  error?: Error;
}

/**
 * Lazy loader for a single module
 */
export class LazyLoader<T> {
  private cache: ModuleCache<T> = {};
  private importFn: () => Promise<T>;

  constructor(importFn: () => Promise<T>) {
    this.importFn = importFn;
  }

  /**
   * Load the module
   */
  async load(): Promise<T> {
    // Return cached module if available
    if (this.cache.module) {
      return this.cache.module;
    }

    // Return cached error
    if (this.cache.error) {
      throw this.cache.error;
    }

    // Return in-flight promise
    if (this.cache.promise) {
      return this.cache.promise;
    }

    // Start new import
    this.cache.promise = this.importFn()
      .then((module) => {
        this.cache.module = module;
        this.cache.promise = undefined;
        return module;
      })
      .catch((error) => {
        this.cache.error = error instanceof Error ? error : new Error(String(error));
        this.cache.promise = undefined;
        throw this.cache.error;
      });

    return this.cache.promise;
  }

  /**
   * Check if module is loaded
   */
  isLoaded(): boolean {
    return this.cache.module !== undefined;
  }

  /**
   * Get cached module (if loaded)
   */
  getCached(): T | undefined {
    return this.cache.module;
  }

  /**
   * Preload the module without blocking
   */
  preload(): void {
    // Don't await - just start loading
    this.load().catch(() => {
      // Ignore errors during preload
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache = {};
  }
}

/**
 * Create a lazy loader for a module
 */
export function lazy<T>(importFn: () => Promise<T>): LazyLoader<T> {
  return new LazyLoader(importFn);
}

/**
 * Backend loaders
 */
export const backends = {
  /**
   * Lazy load SMT2 backend
   */
  smt2: lazy(async () => {
    const mod = await import('../backends/smt2-backend.js');
    return mod.SMT2Backend;
  }),

  /**
   * Lazy load JSON backend
   */
  json: lazy(async () => {
    const mod = await import('../backends/json-backend.js');
    return mod.JSONBackend;
  }),
};

/**
 * Postprocessing loaders
 */
export const postprocessing = {
  /**
   * Lazy load Self Refine
   */
  selfRefine: lazy(async () => {
    const mod = await import('../postprocessing/self-refine.js');
    return mod.SelfRefine;
  }),

  /**
   * Lazy load Self Consistency
   */
  selfConsistency: lazy(async () => {
    const mod = await import('../postprocessing/self-consistency.js');
    return mod.SelfConsistency;
  }),

  /**
   * Lazy load Least to Most
   */
  leastToMost: lazy(async () => {
    const mod = await import('../postprocessing/least-to-most.js');
    return mod.LeastToMost;
  }),

  /**
   * Lazy load Decomposed Prompting
   */
  decomposed: lazy(async () => {
    const mod = await import('../postprocessing/decomposed.js');
    return mod.DecomposedPrompting;
  }),
};

/**
 * Adapter loaders
 */
export const adapters = {
  /**
   * Lazy load native Z3 adapter
   */
  native: lazy(async () => {
    const mod = await import('../adapters/z3-native.js');
    return mod.Z3NativeAdapter;
  }),

  /**
   * Lazy load WASM Z3 adapter
   */
  wasm: lazy(async () => {
    const mod = await import('../adapters/z3-wasm.js');
    return mod.Z3WASMAdapter;
  }),
};

/**
 * Utility loaders
 */
export const utils = {
  /**
   * Lazy load performance profiler
   */
  performance: lazy(async () => {
    const mod = await import('./performance.js');
    return mod.PerformanceProfiler;
  }),

  /**
   * Lazy load cache manager
   */
  cache: lazy(async () => {
    const mod = await import('./cache.js');
    return mod.CacheManager;
  }),

  /**
   * Lazy load batching utilities
   */
  batching: lazy(async () => {
    return import('./batching.js');
  }),

  /**
   * Lazy load Z3 configuration
   */
  z3Config: lazy(async () => {
    return import('./z3-config.js');
  }),
};

/**
 * Lazy component registry
 */
export class LazyRegistry<T> {
  private loaders = new Map<string, LazyLoader<T>>();

  /**
   * Register a lazy component
   */
  register(name: string, importFn: () => Promise<T>): void {
    this.loaders.set(name, lazy(importFn));
  }

  /**
   * Load a component by name
   */
  async load(name: string): Promise<T> {
    const loader = this.loaders.get(name);
    if (!loader) {
      throw new Error(`Component '${name}' not registered`);
    }
    return loader.load();
  }

  /**
   * Check if component is loaded
   */
  isLoaded(name: string): boolean {
    const loader = this.loaders.get(name);
    return loader?.isLoaded() ?? false;
  }

  /**
   * Get cached component
   */
  getCached(name: string): T | undefined {
    const loader = this.loaders.get(name);
    return loader?.getCached();
  }

  /**
   * Preload a component
   */
  preload(name: string): void {
    const loader = this.loaders.get(name);
    loader?.preload();
  }

  /**
   * Preload all components
   */
  preloadAll(): void {
    for (const loader of this.loaders.values()) {
      loader.preload();
    }
  }

  /**
   * Get all registered component names
   */
  getNames(): string[] {
    return Array.from(this.loaders.keys());
  }

  /**
   * Clear a component cache
   */
  clear(name: string): void {
    const loader = this.loaders.get(name);
    loader?.clear();
  }

  /**
   * Clear all component caches
   */
  clearAll(): void {
    for (const loader of this.loaders.values()) {
      loader.clear();
    }
  }
}

/**
 * Preload strategy
 */
export type PreloadStrategy =
  | 'eager' // Load immediately
  | 'idle' // Load when browser is idle
  | 'visible' // Load when visible
  | 'interaction' // Load on user interaction
  | 'manual'; // Manual loading only

/**
 * Preload manager for coordinating lazy loading
 */
export class PreloadManager {
  private loaders: Array<{
    loader: LazyLoader<unknown>;
    strategy: PreloadStrategy;
    priority: number;
  }> = [];

  /**
   * Add a loader with preload strategy
   */
  add<T>(
    loader: LazyLoader<T>,
    strategy: PreloadStrategy = 'idle',
    priority: number = 0
  ): void {
    this.loaders.push({ loader, strategy, priority });
    this.loaders.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start preloading based on strategies
   */
  start(): void {
    for (const { loader, strategy } of this.loaders) {
      switch (strategy) {
        case 'eager':
          loader.preload();
          break;

        case 'idle':
          this.preloadOnIdle(loader);
          break;

        case 'visible':
          this.preloadWhenVisible(loader);
          break;

        case 'interaction':
          this.preloadOnInteraction(loader);
          break;

        case 'manual':
          // Do nothing
          break;
      }
    }
  }

  /**
   * Preload when browser is idle
   */
  private preloadOnIdle<T>(loader: LazyLoader<T>): void {
    if ('requestIdleCallback' in globalThis) {
      requestIdleCallback(() => loader.preload());
    } else {
      // Fallback: use setTimeout
      setTimeout(() => loader.preload(), 1);
    }
  }

  /**
   * Preload when page is visible
   */
  private preloadWhenVisible<T>(loader: LazyLoader<T>): void {
    if (document.visibilityState === 'visible') {
      this.preloadOnIdle(loader);
    } else {
      const handler = (): void => {
        if (document.visibilityState === 'visible') {
          this.preloadOnIdle(loader);
          document.removeEventListener('visibilitychange', handler);
        }
      };
      document.addEventListener('visibilitychange', handler);
    }
  }

  /**
   * Preload on user interaction
   */
  private preloadOnInteraction<T>(loader: LazyLoader<T>): void {
    const events = ['mousedown', 'touchstart', 'keydown'];
    const handler = (): void => {
      loader.preload();
      events.forEach((event) => {
        document.removeEventListener(event, handler);
      });
    };

    events.forEach((event) => {
      document.addEventListener(event, handler, { once: true, passive: true });
    });
  }

  /**
   * Preload all loaders
   */
  preloadAll(): void {
    for (const { loader } of this.loaders) {
      loader.preload();
    }
  }

  /**
   * Clear all loaders
   */
  clear(): void {
    this.loaders = [];
  }
}

/**
 * Create a preload manager with default strategies
 */
export function createPreloadManager(): PreloadManager {
  const manager = new PreloadManager();

  // Add backends with idle loading
  manager.add(backends.smt2, 'idle', 10);
  manager.add(backends.json, 'idle', 10);

  // Add postprocessing with interaction loading
  manager.add(postprocessing.selfRefine, 'interaction', 5);
  manager.add(postprocessing.selfConsistency, 'interaction', 5);
  manager.add(postprocessing.leastToMost, 'interaction', 5);
  manager.add(postprocessing.decomposed, 'interaction', 5);

  // Add utilities with manual loading
  manager.add(utils.performance, 'manual', 1);
  manager.add(utils.cache, 'manual', 1);

  return manager;
}

/**
 * Global preload manager instance
 */
let globalPreloadManager: PreloadManager | null = null;

/**
 * Get or create global preload manager
 */
export function getGlobalPreloadManager(): PreloadManager {
  if (!globalPreloadManager) {
    globalPreloadManager = createPreloadManager();
  }
  return globalPreloadManager;
}

/**
 * Initialize lazy loading with default preload strategies
 */
export function initLazyLoading(): void {
  const manager = getGlobalPreloadManager();
  manager.start();
}
