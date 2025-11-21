/**
 * Optimized Z3 solver configurations
 *
 * Provides pre-tuned Z3 configurations for different use cases
 * to maximize performance and accuracy.
 *
 * @packageDocumentation
 */

/**
 * Z3 optimization profile
 */
export type Z3Profile = 'fast' | 'balanced' | 'thorough' | 'conservative';

/**
 * Z3 configuration options
 */
export interface Z3Config {
  /** Timeout in milliseconds */
  timeout: number;
  /** Memory limit in MB (if supported) */
  memoryLimit?: number;
  /** Additional Z3 options */
  options?: Record<string, string | number | boolean>;
}

/**
 * Get optimized Z3 configuration for a profile
 */
export function getZ3Config(profile: Z3Profile): Z3Config {
  switch (profile) {
    case 'fast':
      return {
        timeout: 5000, // 5 seconds
        memoryLimit: 512, // 512MB
        options: {
          // Prioritize speed over completeness
          'smt.arith.solver': 2, // Use faster arithmetic solver
          'smt.random_seed': 0, // Deterministic for caching
          'sat.random_seed': 0,
          timeout: 5000,
        },
      };

    case 'balanced':
      return {
        timeout: 15000, // 15 seconds
        memoryLimit: 1024, // 1GB
        options: {
          // Balance between speed and accuracy
          'smt.arith.solver': 6, // Default arithmetic solver
          'smt.random_seed': 0,
          'sat.random_seed': 0,
          timeout: 15000,
        },
      };

    case 'thorough':
      return {
        timeout: 60000, // 1 minute
        memoryLimit: 2048, // 2GB
        options: {
          // Prioritize completeness
          'smt.arith.solver': 6,
          'smt.phase_selection': 5, // More thorough phase selection
          'smt.random_seed': 0,
          'sat.random_seed': 0,
          timeout: 60000,
        },
      };

    case 'conservative':
      return {
        timeout: 10000, // 10 seconds
        memoryLimit: 768, // 768MB
        options: {
          // Conservative settings for production
          'smt.arith.solver': 2,
          'smt.random_seed': 0,
          'sat.random_seed': 0,
          timeout: 10000,
          memory_max_size: 768,
        },
      };

    default:
      return getZ3Config('balanced');
  }
}

/**
 * Estimate complexity of a problem and recommend a profile
 */
export function recommendZ3Profile(
  questionLength: number,
  contextLength: number,
  hasQuantifiers: boolean = false
): Z3Profile {
  const totalLength = questionLength + contextLength;

  // Very short and simple queries
  if (totalLength < 100 && !hasQuantifiers) {
    return 'fast';
  }

  // Short queries without quantifiers
  if (totalLength < 300 && !hasQuantifiers) {
    return 'balanced';
  }

  // Long queries or queries with quantifiers
  if (totalLength > 500 || hasQuantifiers) {
    return 'thorough';
  }

  // Default
  return 'balanced';
}

/**
 * Build Z3 command-line options string
 */
export function buildZ3Options(config: Z3Config): string[] {
  const options: string[] = [];

  if (config.options) {
    for (const [key, value] of Object.entries(config.options)) {
      options.push(`-${key}=${value}`);
    }
  }

  return options;
}

/**
 * Parse Z3 version string
 */
export function parseZ3Version(versionString: string): {
  major: number;
  minor: number;
  patch: number;
  full: string;
} {
  const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return { major: 0, minor: 0, patch: 0, full: versionString };
  }

  return {
    major: parseInt(match[1] || '0', 10),
    minor: parseInt(match[2] || '0', 10),
    patch: parseInt(match[3] || '0', 10),
    full: versionString,
  };
}

/**
 * Check if Z3 version meets minimum requirements
 */
export function checkZ3Version(versionString: string): {
  supported: boolean;
  recommended: boolean;
  message: string;
} {
  const version = parseZ3Version(versionString);
  const { major, minor } = version;

  // Minimum: 4.8.x
  if (major < 4 || (major === 4 && minor < 8)) {
    return {
      supported: false,
      recommended: false,
      message: `Z3 version ${version.full} is not supported. Minimum version is 4.8.0.`,
    };
  }

  // Recommended: 4.12.x+
  if (major > 4 || (major === 4 && minor >= 12)) {
    return {
      supported: true,
      recommended: true,
      message: `Z3 version ${version.full} is optimal.`,
    };
  }

  // Supported but not recommended
  return {
    supported: true,
    recommended: false,
    message: `Z3 version ${version.full} is supported but outdated. Recommend upgrading to 4.12.x for best performance.`,
  };
}

/**
 * Adaptive timeout based on previous execution times
 */
export class AdaptiveTimeout {
  private executionTimes: number[] = [];
  private maxHistorySize: number;
  private baseTimeout: number;
  private maxTimeout: number;

  constructor(
    baseTimeout: number = 15000,
    maxTimeout: number = 60000,
    maxHistorySize: number = 100
  ) {
    this.baseTimeout = baseTimeout;
    this.maxTimeout = maxTimeout;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Record an execution time
   */
  recordTime(duration: number): void {
    this.executionTimes.push(duration);

    // Keep only recent history
    if (this.executionTimes.length > this.maxHistorySize) {
      this.executionTimes.shift();
    }
  }

  /**
   * Get recommended timeout based on history
   */
  getRecommendedTimeout(): number {
    if (this.executionTimes.length === 0) {
      return this.baseTimeout;
    }

    // Use 95th percentile + buffer
    const sorted = [...this.executionTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Time = sorted[p95Index] || this.baseTimeout;

    // Add 50% buffer
    const recommendedTimeout = Math.min(p95Time * 1.5, this.maxTimeout);

    return Math.max(recommendedTimeout, this.baseTimeout);
  }

  /**
   * Get average execution time
   */
  getAverageTime(): number {
    if (this.executionTimes.length === 0) {
      return 0;
    }

    const sum = this.executionTimes.reduce((a, b) => a + b, 0);
    return sum / this.executionTimes.length;
  }

  /**
   * Get statistics
   */
  getStats(): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    recommendedTimeout: number;
  } {
    if (this.executionTimes.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p95: 0,
        recommendedTimeout: this.baseTimeout,
      };
    }

    const sorted = [...this.executionTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      count: this.executionTimes.length,
      average: this.getAverageTime(),
      min: Math.min(...this.executionTimes),
      max: Math.max(...this.executionTimes),
      p95: sorted[p95Index] || 0,
      recommendedTimeout: this.getRecommendedTimeout(),
    };
  }

  /**
   * Reset history
   */
  reset(): void {
    this.executionTimes = [];
  }
}

/**
 * Z3 configuration presets for common scenarios
 */
export const Z3_PRESETS = {
  /** Quick answers for simple queries */
  quick: {
    timeout: 3000,
    memoryLimit: 256,
    options: {
      'smt.arith.solver': 2,
      timeout: 3000,
    },
  },

  /** Standard configuration for most queries */
  standard: {
    timeout: 15000,
    memoryLimit: 1024,
    options: {
      timeout: 15000,
    },
  },

  /** Complex queries requiring more resources */
  complex: {
    timeout: 45000,
    memoryLimit: 2048,
    options: {
      'smt.phase_selection': 5,
      timeout: 45000,
    },
  },

  /** Production-ready conservative settings */
  production: {
    timeout: 10000,
    memoryLimit: 768,
    options: {
      timeout: 10000,
      memory_max_size: 768,
    },
  },

  /** Development mode with verbose output */
  development: {
    timeout: 30000,
    memoryLimit: 1536,
    options: {
      timeout: 30000,
      verbose: 1,
    },
  },

  /** Benchmark mode for consistent results */
  benchmark: {
    timeout: 60000,
    memoryLimit: 2048,
    options: {
      'smt.random_seed': 0,
      'sat.random_seed': 0,
      timeout: 60000,
    },
  },
} as const;

/**
 * Get preset configuration by name
 */
export function getZ3Preset(name: keyof typeof Z3_PRESETS): Z3Config {
  return Z3_PRESETS[name];
}
