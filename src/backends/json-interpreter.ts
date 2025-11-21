/**
 * Z3 JSON Interpreter
 * Executes JSON DSL programs using Z3
 */

import type { Z3Adapter } from '../types/index.js';
import type { JSONProgram, JSONExecutionResult, SortDefinition } from './json-dsl-types.js';
import { ValidationError, BackendError } from '../types/errors.js';
import { validateJSONProgram, isExpressionSafe, isSortValid } from './json-dsl-validators.js';

/**
 * Z3 JSON Interpreter
 * Translates and executes JSON DSL programs using Z3 solver
 */
export class Z3JSONInterpreter {
  constructor(private z3Adapter: Z3Adapter) {}

  /**
   * Execute a JSON program and return verification results
   * @param program - The JSON program to execute
   * @param timeout - Timeout in milliseconds
   * @returns Execution result with verifications
   */
  async execute(program: unknown, timeout = 30000): Promise<JSONExecutionResult> {
    const startTime = Date.now();

    // Step 1: Validate the JSON program
    let validProgram: JSONProgram;
    try {
      validProgram = validateJSONProgram(program);
    } catch (error) {
      throw new ValidationError(
        `Invalid JSON program: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 2: Validate expression safety
    this.validateExpressionSafety(validProgram);

    // Step 3: Validate sort references
    this.validateSortReferences(validProgram);

    // Step 4: Build SMT2 representation
    // Since we need to use Z3 CLI/WASM, we convert JSON DSL to SMT2
    const smt2Formula = this.convertToSMT2(validProgram);

    // Step 5: Execute with Z3
    const result = await this.z3Adapter.executeSMT2(smt2Formula);

    const executionTime = Date.now() - startTime;

    // Step 6: Process results
    return this.processResults(result.rawOutput, validProgram, executionTime);
  }

  /**
   * Validate expression safety
   */
  private validateExpressionSafety(program: JSONProgram): void {
    const expressions: string[] = [
      ...(program.knowledge_base || []),
      ...Object.values(program.verifications),
    ];

    if (program.rules) {
      for (const rule of program.rules) {
        expressions.push(rule.antecedent, rule.consequent);
      }
    }

    for (const expr of expressions) {
      if (!isExpressionSafe(expr)) {
        throw new ValidationError(
          `Unsafe expression detected: ${expr}. Only whitelisted Z3 operators are allowed.`
        );
      }
    }
  }

  /**
   * Validate sort references
   */
  private validateSortReferences(program: JSONProgram): void {
    // Validate function domain/range references
    if (program.functions) {
      for (const [funcName, func] of Object.entries(program.functions)) {
        for (const sortName of func.domain) {
          if (!isSortValid(sortName, program.sorts)) {
            throw new ValidationError(
              `Function '${funcName}' references undefined sort: ${sortName}`
            );
          }
        }
        if (!isSortValid(func.range, program.sorts)) {
          throw new ValidationError(
            `Function '${funcName}' has undefined range sort: ${func.range}`
          );
        }
      }
    }

    // Validate constant sort references
    if (program.constants) {
      for (const [constName, sortName] of Object.entries(program.constants)) {
        if (!isSortValid(sortName, program.sorts)) {
          throw new ValidationError(
            `Constant '${constName}' references undefined sort: ${sortName}`
          );
        }
      }
    }
  }

  /**
   * Convert JSON program to SMT2 format
   */
  private convertToSMT2(program: JSONProgram): string {
    const smt2Lines: string[] = [];

    // Declare sorts
    for (const [sortName, sortDef] of Object.entries(program.sorts)) {
      smt2Lines.push(this.sortToSMT2(sortName, sortDef));
    }

    // Declare functions
    if (program.functions) {
      for (const [funcName, func] of Object.entries(program.functions)) {
        const domainSorts = func.domain.join(' ');
        smt2Lines.push(`(declare-fun ${funcName} (${domainSorts}) ${func.range})`);
      }
    }

    // Declare constants
    if (program.constants) {
      for (const [constName, sortName] of Object.entries(program.constants)) {
        smt2Lines.push(`(declare-const ${constName} ${sortName})`);
      }
    }

    // Add knowledge base assertions
    if (program.knowledge_base) {
      for (const assertion of program.knowledge_base) {
        const smt2Expr = this.expressionToSMT2(assertion);
        smt2Lines.push(`(assert ${smt2Expr})`);
      }
    }

    // Add rules as assertions
    if (program.rules) {
      for (const rule of program.rules) {
        const antecedent = this.expressionToSMT2(rule.antecedent);
        const consequent = this.expressionToSMT2(rule.consequent);
        const implication = `(=> ${antecedent} ${consequent})`;

        if (rule.variables && rule.variables.length > 0) {
          // Wrap in ForAll if variables provided
          const varBindings = rule.variables.map((v) => `(${v} ${program.sorts[v] || 'Bool'})`).join(' ');
          smt2Lines.push(`(assert (forall (${varBindings}) ${implication}))`);
        } else {
          smt2Lines.push(`(assert ${implication})`);
        }
      }
    }

    // Add verification queries
    for (const [queryName, query] of Object.entries(program.verifications)) {
      const smt2Expr = this.expressionToSMT2(query);
      // Add as comment for tracking
      smt2Lines.push(`; Verification: ${queryName}`);
      smt2Lines.push(`(assert ${smt2Expr})`);
    }

    // Add check-sat and get-model commands
    smt2Lines.push('(check-sat)');
    smt2Lines.push('(get-model)');

    return smt2Lines.join('\n');
  }

  /**
   * Convert sort definition to SMT2
   */
  private sortToSMT2(sortName: string, sortDef: SortDefinition): string {
    if (sortDef === 'DeclareSort') {
      return `(declare-sort ${sortName} 0)`;
    } else if (sortDef === 'Bool') {
      return `; ${sortName} = Bool (built-in)`;
    } else if (sortDef === 'Int') {
      return `; ${sortName} = Int (built-in)`;
    } else if (sortDef === 'Real') {
      return `; ${sortName} = Real (built-in)`;
    } else if (typeof sortDef === 'object' && 'BitVec' in sortDef) {
      return `; ${sortName} = (_ BitVec ${sortDef.BitVec})`;
    } else if (typeof sortDef === 'object' && 'Enum' in sortDef) {
      const values = sortDef.Enum.join(' ');
      return `(declare-datatypes ((${sortName} 0)) (((${values}))))`;
    } else if (typeof sortDef === 'object' && 'Array' in sortDef) {
      return `; ${sortName} = (Array ${sortDef.Array.domain} ${sortDef.Array.range})`;
    }
    return `; Unknown sort: ${sortName}`;
  }

  /**
   * Convert JSON DSL expression to SMT2
   * This performs basic conversion - more sophisticated parsing would be needed for production
   */
  private expressionToSMT2(expr: string): string {
    // Replace ForAll/Exists with SMT2 syntax
    let smt2Expr = expr;

    // ForAll(x, ...) -> (forall ((x Sort)) ...)
    // This is a simplified conversion - proper parsing would be better
    smt2Expr = smt2Expr.replace(/ForAll\s*\(/g, '(forall ');
    smt2Expr = smt2Expr.replace(/Exists\s*\(/g, '(exists ');

    // Implies(a, b) -> (=> a b)
    smt2Expr = smt2Expr.replace(/Implies\s*\(/g, '(=> ');

    // And(...) -> (and ...)
    smt2Expr = smt2Expr.replace(/And\s*\(/g, '(and ');

    // Or(...) -> (or ...)
    smt2Expr = smt2Expr.replace(/Or\s*\(/g, '(or ');

    // Not(...) -> (not ...)
    smt2Expr = smt2Expr.replace(/Not\s*\(/g, '(not ');

    // If(cond, then, else) -> (ite cond then else)
    smt2Expr = smt2Expr.replace(/If\s*\(/g, '(ite ');

    return smt2Expr;
  }

  /**
   * Process Z3 results
   */
  private processResults(
    rawOutput: string,
    program: JSONProgram,
    executionTime: number
  ): JSONExecutionResult {
    const isSat = rawOutput.includes('sat') && !rawOutput.includes('unsat');
    const isUnsat = rawOutput.includes('unsat');

    // For now, treat all verifications as having the same result
    // More sophisticated parsing would check individual assertions
    const overallResult: 'sat' | 'unsat' | 'unknown' = isSat ? 'sat' : isUnsat ? 'unsat' : 'unknown';

    const verifications: Record<string, 'sat' | 'unsat' | 'unknown'> = {};
    for (const queryName of Object.keys(program.verifications)) {
      verifications[queryName] = overallResult;
    }

    // Extract model if available
    let model: Record<string, unknown> | undefined;
    if (isSat) {
      model = this.extractModel(rawOutput);
    }

    const sat_count = isSat ? Object.keys(verifications).length : 0;
    const unsat_count = isUnsat ? Object.keys(verifications).length : 0;

    return {
      verifications,
      model,
      sat_count,
      unsat_count,
      rawOutput,
      executionTime,
    };
  }

  /**
   * Extract model values from Z3 output
   */
  private extractModel(output: string): Record<string, unknown> {
    const model: Record<string, unknown> = {};

    // Simple extraction - look for (define-fun ...) patterns
    const definePattern = /\(define-fun\s+(\w+)\s+\(\)\s+\w+\s+([^)]+)\)/g;
    let match;

    while ((match = definePattern.exec(output)) !== null) {
      const [, name, value] = match;
      if (name && value) {
        model[name] = value.trim();
      }
    }

    return model;
  }
}
