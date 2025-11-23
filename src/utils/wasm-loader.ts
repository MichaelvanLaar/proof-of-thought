/**
 * WASM loading optimization utilities
 *
 * Provides optimized loading strategies for Z3 WASM module including
 * lazy loading, compression, and caching.
 *
 * @packageDocumentation
 */

/**
 * WASM loader configuration
 */
export interface WASMLoaderConfig {
  /**
   * URL or path to WASM file
   */
  wasmUrl?: string;

  /**
   * Enable compression (gzip/brotli)
   * @default true
   */
  compression?: boolean;

  /**
   * Enable browser caching
   * @default true
   */
  cache?: boolean;

  /**
   * Cache name for browser Cache API
   * @default 'z3-wasm-cache'
   */
  cacheName?: string;

  /**
   * Timeout for WASM loading (ms)
   * @default 30000
   */
  timeout?: number;

  /**
   * Enable streaming compilation
   * @default true
   */
  streaming?: boolean;
}

/**
 * WASM loading result
 */
export interface WASMLoadResult {
  module: WebAssembly.Module;
  instance?: WebAssembly.Instance;
  loadTime: number;
  size: number;
  cached: boolean;
}

/**
 * Optimized WASM loader with caching and compression support
 */
export class WASMLoader {
  private config: Required<WASMLoaderConfig>;
  private loadedModule: WebAssembly.Module | null = null;
  private loadPromise: Promise<WASMLoadResult> | null = null;

  constructor(config: WASMLoaderConfig = {}) {
    this.config = {
      wasmUrl: config.wasmUrl || '',
      compression: config.compression !== false,
      cache: config.cache !== false,
      cacheName: config.cacheName || 'z3-wasm-cache',
      timeout: config.timeout || 30000,
      streaming: config.streaming !== false,
    };
  }

  /**
   * Load WASM module with optimization
   */
  async load(wasmUrl?: string): Promise<WASMLoadResult> {
    const url = wasmUrl || this.config.wasmUrl;

    if (!url) {
      throw new Error('WASM URL not provided');
    }

    // Return cached load promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Return cached module if already loaded
    if (this.loadedModule) {
      return {
        module: this.loadedModule,
        loadTime: 0,
        size: 0,
        cached: true,
      };
    }

    // Start new load
    this.loadPromise = this.loadWASM(url);

    try {
      const result = await this.loadPromise;
      this.loadedModule = result.module;
      return result;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Load WASM module from URL
   */
  private async loadWASM(url: string): Promise<WASMLoadResult> {
    const startTime = performance.now();

    try {
      // Try to load from cache first
      if (this.config.cache && 'caches' in globalThis) {
        const cached = await this.loadFromCache(url);
        if (cached) {
          return {
            ...cached,
            loadTime: performance.now() - startTime,
            cached: true,
          };
        }
      }

      // Fetch WASM file
      const response = await this.fetchWithTimeout(url, this.config.timeout);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch WASM: ${response.status} ${response.statusText}`
        );
      }

      // Cache the response
      if (this.config.cache && 'caches' in globalThis) {
        await this.cacheResponse(url, response.clone());
      }

      // Compile WASM module
      const module = await this.compileWASM(response);
      const size = parseInt(
        response.headers.get('content-length') || '0',
        10
      );

      return {
        module,
        loadTime: performance.now() - startTime,
        size,
        cached: false,
      };
    } catch (error) {
      throw new Error(
        `Failed to load WASM from ${url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compile WASM from response
   */
  private async compileWASM(
    response: Response
  ): Promise<WebAssembly.Module> {
    // Use streaming compilation if supported
    if (
      this.config.streaming &&
      typeof WebAssembly.compileStreaming === 'function'
    ) {
      try {
        return await WebAssembly.compileStreaming(response);
      } catch (error) {
        // Fall back to buffer compilation
        console.warn('Streaming compilation failed, falling back:', error);
      }
    }

    // Buffer compilation
    const buffer = await response.arrayBuffer();
    return WebAssembly.compile(buffer);
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        // Request compression if supported
        headers: this.config.compression
          ? {
              'Accept-Encoding': 'gzip, deflate, br',
            }
          : {},
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Load from browser cache
   */
  private async loadFromCache(
    url: string
  ): Promise<{ module: WebAssembly.Module; size: number } | null> {
    try {
      const cache = await caches.open(this.config.cacheName);
      const response = await cache.match(url);

      if (!response) {
        return null;
      }

      const module = await this.compileWASM(response);
      const size = parseInt(
        response.headers.get('content-length') || '0',
        10
      );

      return { module, size };
    } catch (error) {
      console.warn('Failed to load from cache:', error);
      return null;
    }
  }

  /**
   * Cache response
   */
  private async cacheResponse(
    url: string,
    response: Response
  ): Promise<void> {
    try {
      const cache = await caches.open(this.config.cacheName);
      await cache.put(url, response);
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  /**
   * Clear WASM cache
   */
  async clearCache(): Promise<void> {
    if ('caches' in globalThis) {
      await caches.delete(this.config.cacheName);
    }
    this.loadedModule = null;
    this.loadPromise = null;
  }

  /**
   * Preload WASM module
   */
  async preload(wasmUrl?: string): Promise<void> {
    await this.load(wasmUrl);
  }

  /**
   * Get loaded module
   */
  getModule(): WebAssembly.Module | null {
    return this.loadedModule;
  }

  /**
   * Check if module is loaded
   */
  isLoaded(): boolean {
    return this.loadedModule !== null;
  }
}

/**
 * Global WASM loader instance
 */
let globalWASMLoader: WASMLoader | null = null;

/**
 * Get or create global WASM loader
 */
export function getGlobalWASMLoader(): WASMLoader {
  if (!globalWASMLoader) {
    globalWASMLoader = new WASMLoader();
  }
  return globalWASMLoader;
}

/**
 * Set global WASM loader
 */
export function setGlobalWASMLoader(loader: WASMLoader | null): void {
  globalWASMLoader = loader;
}

/**
 * Lazy load WASM module
 *
 * Returns a promise that resolves to the WASM module when needed.
 */
export function lazyLoadWASM(
  url: string,
  config?: WASMLoaderConfig
): () => Promise<WebAssembly.Module> {
  const loader = new WASMLoader({ ...config, wasmUrl: url });

  return async (): Promise<WebAssembly.Module> => {
    const result = await loader.load();
    return result.module;
  };
}

/**
 * Preload WASM module in the background
 *
 * Starts loading the WASM module without blocking.
 */
export function preloadWASM(
  url: string,
  config?: WASMLoaderConfig
): Promise<void> {
  const loader = new WASMLoader({ ...config, wasmUrl: url });
  return loader.preload();
}

/**
 * Check WASM support
 */
export function isWASMSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.compile === 'function') {
      // Test with minimal valid WASM module
      const module = new WebAssembly.Module(
        new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
      );
      return module instanceof WebAssembly.Module;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check streaming compilation support
 */
export function isStreamingSupported(): boolean {
  return typeof WebAssembly.compileStreaming === 'function';
}

/**
 * Get WASM feature support information
 */
export function getWASMSupport(): {
  supported: boolean;
  streaming: boolean;
  caching: boolean;
} {
  return {
    supported: isWASMSupported(),
    streaming: isStreamingSupported(),
    caching: 'caches' in globalThis,
  };
}

/**
 * Estimate WASM load time based on size and connection
 */
export function estimateLoadTime(
  sizeBytes: number,
  connection?: 'slow-2g' | '2g' | '3g' | '4g' | '5g'
): number {
  // Estimated download speeds (bytes/ms)
  const speeds = {
    'slow-2g': 50, // ~50 KB/s
    '2g': 250, // ~250 KB/s
    '3g': 750, // ~750 KB/s
    '4g': 10000, // ~10 MB/s
    '5g': 50000, // ~50 MB/s
  };

  const speed = connection ? speeds[connection] : speeds['4g'];
  const downloadTime = sizeBytes / speed;

  // Add compilation overhead (rough estimate: 2x download time)
  const compilationTime = downloadTime * 2;

  return downloadTime + compilationTime;
}
