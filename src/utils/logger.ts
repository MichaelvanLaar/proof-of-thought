/**
 * Logger utility for proof-of-thought
 * Provides controlled logging that respects environment settings
 */

export const logger = {
  /**
   * Log warnings (always enabled)
   */
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(message, ...args);
  },

  /**
   * Log errors (always enabled)
   */
  error: (message: string, ...args: unknown[]): void => {
    console.error(message, ...args);
  },

  /**
   * Log debug information (only in development or when DEBUG is set)
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (process.env['DEBUG'] || process.env['NODE_ENV'] !== 'production') {
      // eslint-disable-next-line no-console
      console.log(message, ...args);
    }
  },

  /**
   * Log informational messages (respects verbose flag)
   */
  info: (message: string, ...args: unknown[]): void => {
    if (process.env['DEBUG'] || process.env['NODE_ENV'] !== 'production') {
      // eslint-disable-next-line no-console
      console.log(message, ...args);
    }
  },
};
