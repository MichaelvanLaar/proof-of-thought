/**
 * JSON Backend - JSON DSL format backend
 */

import type { Backend, Formula, VerificationResult } from '../types/index.js';
import { BackendError } from '../types/errors.js';

/**
 * JSON Backend implementation using custom JSON DSL
 * Executes formulas via Z3 API
 */
export class JSONBackend implements Backend {
  readonly type = 'json' as const;

  constructor() {
    // Implementation in Phase 5
  }

  async translate(question: string, context: string): Promise<Formula> {
    // Implementation in Phase 5: Task 5.3
    throw new BackendError('JSON translation not yet implemented', 'json');
  }

  async verify(formula: Formula): Promise<VerificationResult> {
    // Implementation in Phase 5: Task 5.9
    throw new BackendError('JSON verification not yet implemented', 'json');
  }

  async explain(result: VerificationResult): Promise<string> {
    // Implementation in Phase 5
    throw new BackendError('JSON explanation not yet implemented', 'json');
  }
}
