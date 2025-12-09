/**
 * Z3 JSON Interpreter
 * Executes JSON DSL programs using Z3
 */

import type { Z3Adapter } from '../types/index.js';
import type { JSONProgram, JSONExecutionResult, SortDefinition } from './json-dsl-types.js';
import { ValidationError } from '../types/errors.js';
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
   * @param _timeout - Timeout in milliseconds (not yet implemented)
   * @returns Execution result with verifications
   */
  async execute(program: unknown, _timeout = 30000): Promise<JSONExecutionResult> {
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
        const smt2Expr = this.expressionToSMT2(assertion, program);
        smt2Lines.push(`(assert ${smt2Expr})`);
      }
    }

    // Add rules as assertions
    if (program.rules) {
      for (const rule of program.rules) {
        const antecedent = this.expressionToSMT2(rule.antecedent, program);
        const consequent = this.expressionToSMT2(rule.consequent, program);
        const implication = `(=> ${antecedent} ${consequent})`;

        if (rule.variables && rule.variables.length > 0) {
          // Wrap in ForAll if variables provided
          const varBindings = rule.variables
            .map((v) => `(${v} ${program.sorts[v] || 'Bool'})`)
            .join(' ');
          smt2Lines.push(`(assert (forall (${varBindings}) ${implication}))`);
        } else {
          smt2Lines.push(`(assert ${implication})`);
        }
      }
    }

    // Add verification queries (negated for proof by refutation)
    // We check if NOT(query) is satisfiable:
    // - If UNSAT, then query must be true
    // - If SAT, then query is false (we found a counterexample)
    for (const [queryName, query] of Object.entries(program.verifications)) {
      const smt2Expr = this.expressionToSMT2(query, program);
      // Add as comment for tracking
      smt2Lines.push(`; Verification: ${queryName}`);
      smt2Lines.push(`(assert (not ${smt2Expr}))`);
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
   * Properly parses the expression tree and converts to SMT2 syntax
   */
  private expressionToSMT2(expr: string, program?: JSONProgram): string {
    return this.parseAndConvertExpression(expr.trim(), program);
  }

  /**
   * Parse and convert a JSON DSL expression to SMT2
   */
  private parseAndConvertExpression(expr: string, program?: JSONProgram): string {
    // Handle special quantifier cases
    if (expr.startsWith('ForAll(') || expr.startsWith('Exists(')) {
      return this.convertQuantifier(expr, program);
    }

    // Handle logical operators
    const logicalOps: Record<string, string> = {
      Implies: '=>',
      And: 'and',
      Or: 'or',
      Not: 'not',
      If: 'ite',
      Eq: '=',
      Distinct: 'distinct',
    };

    for (const [dslOp, smt2Op] of Object.entries(logicalOps)) {
      if (expr.startsWith(`${dslOp}(`)) {
        const args = this.extractArgs(expr.substring(dslOp.length));
        const convertedArgs = args.map((arg) => this.parseAndConvertExpression(arg, program));
        return `(${smt2Op} ${convertedArgs.join(' ')})`;
      }
    }

    // Handle function application: Func(arg1, arg2) -> (Func arg1 arg2)
    const funcMatch = expr.match(/^(\w+)\((.*)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const argsStr = funcMatch[2];
      if (!funcName) {
        throw new ValidationError(`Invalid function name in expression: ${expr}`);
      }
      if (argsStr && argsStr.trim()) {
        const args = this.extractArgs(`(${argsStr})`);
        const convertedArgs = args.map((arg) => this.parseAndConvertExpression(arg, program));
        return `(${funcName} ${convertedArgs.join(' ')})`;
      } else {
        // No arguments - just a constant
        return funcName;
      }
    }

    // Handle atoms (variables, constants, literals)
    return expr;
  }

  /**
   * Convert ForAll/Exists quantifiers
   * ForAll(x, body) -> (forall ((x Type)) body)
   */
  private convertQuantifier(expr: string, program?: JSONProgram): string {
    const isForAll = expr.startsWith('ForAll(');
    const quantifier = isForAll ? 'forall' : 'exists';
    const argsStart = expr.indexOf('(') + 1;

    // Extract variable and body
    const args = this.extractArgs(expr.substring(argsStart - 1));
    if (args.length !== 2) {
      throw new ValidationError(
        `Quantifier must have exactly 2 arguments: variable and body, got ${args.length}`
      );
    }

    const varExpr = args[0];
    const body = args[1];

    if (!varExpr || !body) {
      throw new ValidationError(`Invalid quantifier expression: ${expr}`);
    }

    // Parse variable (could be single var or list)
    const variables = varExpr.split(/\s+/).filter((v) => v.length > 0);

    // For each variable, we need to determine its sort
    // For now, we'll assume all quantified variables are of the first declared sort
    // (In a more sophisticated implementation, we'd need type inference)
    const defaultSort = program ? Object.keys(program.sorts)[0] : 'Entity';

    const varBindings = variables.map((v) => `(${v} ${defaultSort})`).join(' ');
    const convertedBody = this.parseAndConvertExpression(body, program);

    return `(${quantifier} (${varBindings}) ${convertedBody})`;
  }

  /**
   * Extract arguments from a parenthesized expression
   * Handles nested parentheses and commas correctly
   * E.g., "(a, Func(b, c), d)" -> ["a", "Func(b, c)", "d"]
   */
  private extractArgs(expr: string): string[] {
    if (!expr.startsWith('(') || !expr.endsWith(')')) {
      return [expr];
    }

    const content = expr.substring(1, expr.length - 1).trim();
    if (!content) {
      return [];
    }

    const args: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        // Top-level comma - split here
        args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Push the last argument
    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
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
    const overallResult: 'sat' | 'unsat' | 'unknown' = isSat
      ? 'sat'
      : isUnsat
        ? 'unsat'
        : 'unknown';

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
