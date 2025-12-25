/**
 * SMT2 Executor - Execute parsed SMT2 commands using z3-solver API
 *
 * This executor translates SMT2 AST into z3-solver JavaScript API calls
 * and executes them to produce verification results.
 */

import type { VerificationResult } from '../types/index.js';
import type { SMT2Command, SMT2Expr, SMT2Type } from './smt2-parser.js';
import { SMT2UnsupportedError } from './smt2-parser.js';
import { Z3Error } from '../types/errors.js';

/**
 * Execution context maintaining variable declarations and solver state
 */
interface ExecutionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  z3Context: any; // Z3 Context instance (from Context('main'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: Map<string, any>; // Variable name → z3 expression
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  solver: any; // Z3 solver instance
  timeout: number;
}

/**
 * Execute parsed SMT2 commands using z3-solver API
 *
 * @param commands - Parsed SMT2 commands
 * @param z3Context - Initialized z3-solver context
 * @param timeout - Timeout in milliseconds
 * @returns Verification result with sat/unsat/unknown and model
 */
// Counter for unique context names to avoid conflicts
let contextCounter = 0;

export async function executeSMT2Commands(
  commands: SMT2Command[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Z3: any,
  timeout = 30000
): Promise<VerificationResult> {
  const startTime = Date.now();

  try {
    // Create Z3 context with unique name to avoid conflicts between queries
    const { Context } = Z3;
    const contextName = `ctx_${Date.now()}_${++contextCounter}`;
    const z3Context = new Context(contextName);
    const solver = new z3Context.Solver();

    // Set timeout on solver with robust error handling
    if (timeout > 0) {
      try {
        // Try string parameter format first (most common)
        solver.set('timeout', timeout);
      } catch (_e) {
        // Fall back to object format if string format fails
        try {
          solver.set({ timeout });
        } catch (_e2) {
          // Timeout setting not supported, continue without it
          // This can happen in some browser WASM configurations
        }
      }
    }

    const ctx: ExecutionContext = {
      z3Context,
      variables: new Map(),
      solver,
      timeout,
    };

    // Execute commands sequentially
    let hasCheckSat = false;
    let hasGetModel = false;

    try {
      for (const cmd of commands) {
        switch (cmd.type) {
          case 'declare-const':
            executeDeclareConst(cmd, ctx);
            break;

          case 'declare-fun':
            executeDeclareFun(cmd, ctx);
            break;

          case 'assert':
            executeAssert(cmd, ctx);
            break;

          case 'check-sat':
            hasCheckSat = true;
            break;

          case 'get-model':
            hasGetModel = true;
            break;

          case 'set-logic':
            // Logic setting is informational, no action needed
            break;

          default:
            throw new SMT2UnsupportedError(`Unknown command type: ${(cmd as SMT2Command).type}`);
        }
      }
    } catch (error) {
      // Error during command execution
      // Re-throw SMT2UnsupportedError and Z3Error as they indicate real issues
      if (error instanceof SMT2UnsupportedError || error instanceof Z3Error) {
        throw error;
      }
      // For other errors (e.g., Z3 type errors), return unknown for graceful handling
      const executionTime = Date.now() - startTime;
      return {
        result: 'unknown',
        rawOutput: `Error during command execution: ${error instanceof Error ? error.message : String(error)}`,
        executionTime,
      };
    }

    // Check satisfiability
    let checkResult: string;
    let reasonUnknown: string | undefined;
    try {
      checkResult = await solver.check();
    } catch (error) {
      // Z3 error during solving (e.g., invalid formula)
      // Return unknown instead of throwing
      const executionTime = Date.now() - startTime;
      return {
        result: 'unknown',
        rawOutput: `Z3 error: ${error instanceof Error ? error.message : String(error)}`,
        executionTime,
      };
    }

    const executionTime = Date.now() - startTime;

    // Normalize result comparison (handle potential variations in case/whitespace)
    const normalizedResult = String(checkResult).toLowerCase().trim();
    let result: 'sat' | 'unsat' | 'unknown' = 'unknown';
    if (normalizedResult === 'sat') result = 'sat';
    else if (normalizedResult === 'unsat') result = 'unsat';
    else {
      // Try to get reason for unknown result
      try {
        if (typeof solver.reason_unknown === 'function') {
          reasonUnknown = solver.reason_unknown();
        }
      } catch (_e) {
        // reason_unknown might not be available
      }
    }

    // Extract model if sat and model requested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: Record<string, any> | undefined;

    if (result === 'sat' && (hasGetModel || hasCheckSat)) {
      try {
        const z3Model = solver.model();
        model = extractModel(z3Model, ctx);
      } catch (_error) {
        // Model extraction failed, but we still have sat result
        // Continue without model
      }
    }

    // Build raw output with reason if unknown
    let rawOutput = checkResult;
    if (result === 'unknown' && reasonUnknown) {
      rawOutput = `${checkResult} (reason: ${reasonUnknown})`;
    }

    const verificationResult: VerificationResult = {
      result,
      model,
      rawOutput,
      executionTime,
    };

    return verificationResult;
  } catch (error) {
    const executionTime = Date.now() - startTime;

    if (error instanceof SMT2UnsupportedError) {
      throw error;
    }

    throw new Z3Error(
      `SMT2 execution failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      { executionTime }
    );
  }
}

/**
 * Execute declare-const command
 */
function executeDeclareConst(
  cmd: SMT2Command & { type: 'declare-const' },
  ctx: ExecutionContext
): void {
  const { z3Context: z3, variables } = ctx;
  const { name, sort } = cmd;

  const z3Var = createZ3Variable(name, sort, z3);
  variables.set(name, z3Var);
}

/**
 * Execute declare-fun command
 */
function executeDeclareFun(
  cmd: SMT2Command & { type: 'declare-fun' },
  ctx: ExecutionContext
): void {
  const { z3Context: z3, variables } = ctx;
  const { name, params, return: returnType } = cmd;

  // For 0-arity functions (constants), treat as declare-const
  if (params.length === 0) {
    const z3Var = createZ3Variable(name, returnType, z3);
    variables.set(name, z3Var);
    return;
  }

  // For functions with parameters, create uninterpreted function
  throw new SMT2UnsupportedError(
    'declare-fun with parameters',
    'Uninterpreted functions not yet supported. Use declare-const for constants.'
  );
}

/**
 * Execute assert command
 */
function executeAssert(cmd: SMT2Command & { type: 'assert' }, ctx: ExecutionContext): void {
  const { solver } = ctx;
  const z3Expr = translateExpr(cmd.expr, ctx);
  solver.add(z3Expr);
}

/**
 * Create Z3 variable based on type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createZ3Variable(name: string, sort: SMT2Type, z3: any): any {
  if (typeof sort !== 'string') {
    throw new SMT2UnsupportedError('function types', 'Function types not supported');
  }

  const { Int, Bool, Real } = z3;

  switch (sort) {
    case 'Int':
      return Int.const(name);

    case 'Bool':
      return Bool.const(name);

    case 'Real':
      return Real.const(name);

    default:
      throw new SMT2UnsupportedError(sort, `Unsupported type: ${sort}`);
  }
}

/**
 * Translate SMT2 expression to z3-solver expression
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function translateExpr(expr: SMT2Expr, ctx: ExecutionContext): any {
  const { z3Context: z3, variables } = ctx;

  if (expr.type === 'var') {
    const z3Var = variables.get(expr.name);
    if (!z3Var) {
      throw new Z3Error(`Undefined variable: ${expr.name}`);
    }
    return z3Var;
  }

  if (expr.type === 'const') {
    const { Int, Bool, Real } = z3;

    if (typeof expr.value === 'boolean') {
      return expr.value ? Bool.val(true) : Bool.val(false);
    }

    if (Number.isInteger(expr.value)) {
      return Int.val(expr.value);
    }

    // Real number
    return Real.val(expr.value.toString());
  }

  if (expr.type === 'app') {
    const { op, args } = expr;
    const z3Args = args.map((arg) => translateExpr(arg, ctx));

    return translateOperation(op, z3Args, z3);
  }

  throw new Z3Error(`Unknown expression type: ${JSON.stringify(expr)}`);
}

/**
 * Translate SMT2 operation to z3-solver API call
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function translateOperation(op: string, args: any[], z3: any): any {
  // Arithmetic operations
  if (op === '+') {
    return args.reduce((acc, arg) => acc.add(arg));
  }

  if (op === '-') {
    if (args.length === 1) {
      // Unary minus
      return args[0].neg();
    }
    return args.reduce((acc, arg) => acc.sub(arg));
  }

  if (op === '*') {
    return args.reduce((acc, arg) => acc.mul(arg));
  }

  if (op === 'div') {
    if (args.length !== 2) {
      throw new Z3Error('div requires exactly 2 arguments');
    }
    return args[0].div(args[1]);
  }

  if (op === 'mod') {
    if (args.length !== 2) {
      throw new Z3Error('mod requires exactly 2 arguments');
    }
    return args[0].mod(args[1]);
  }

  // Comparison operations
  if (op === '<') {
    if (args.length !== 2) {
      throw new Z3Error('< requires exactly 2 arguments');
    }
    return args[0].lt(args[1]);
  }

  if (op === '<=') {
    if (args.length !== 2) {
      throw new Z3Error('<= requires exactly 2 arguments');
    }
    return args[0].le(args[1]);
  }

  if (op === '>') {
    if (args.length !== 2) {
      throw new Z3Error('> requires exactly 2 arguments');
    }
    return args[0].gt(args[1]);
  }

  if (op === '>=') {
    if (args.length !== 2) {
      throw new Z3Error('>= requires exactly 2 arguments');
    }
    return args[0].ge(args[1]);
  }

  if (op === '=') {
    if (args.length !== 2) {
      throw new Z3Error('= requires exactly 2 arguments');
    }
    return args[0].eq(args[1]);
  }

  if (op === 'distinct') {
    if (args.length < 2) {
      throw new Z3Error('distinct requires at least 2 arguments');
    }
    // For n-ary distinct, use z3.Distinct helper if available, or build pairwise inequalities
    return z3.Distinct(...args);
  }

  // Logical operations
  if (op === 'and') {
    return z3.And(...args);
  }

  if (op === 'or') {
    return z3.Or(...args);
  }

  if (op === 'not') {
    if (args.length !== 1) {
      throw new Z3Error('not requires exactly 1 argument');
    }
    return z3.Not(args[0]);
  }

  if (op === '=>' || op === 'implies') {
    if (args.length !== 2) {
      throw new Z3Error('=> requires exactly 2 arguments');
    }
    return z3.Implies(args[0], args[1]);
  }

  if (op === 'iff') {
    if (args.length !== 2) {
      throw new Z3Error('iff requires exactly 2 arguments');
    }
    // iff(a, b) is equivalent to (a => b) and (b => a)
    return z3.And(z3.Implies(args[0], args[1]), z3.Implies(args[1], args[0]));
  }

  // Conditional
  if (op === 'ite') {
    if (args.length !== 3) {
      throw new Z3Error('ite requires exactly 3 arguments');
    }
    return z3.If(args[0], args[1], args[2]);
  }

  throw new SMT2UnsupportedError(op, `Unsupported operation: ${op}`);
}

/**
 * Extract model from Z3 solver
 */
function extractModel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  z3Model: any,
  ctx: ExecutionContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model: Record<string, any> = {};

  // Iterate through declared variables and get their values
  for (const [name, z3Var] of ctx.variables.entries()) {
    try {
      const value = z3Model.eval(z3Var);

      // Convert z3 value to string based on type
      // For boolean values, use sexpr() which returns "true" or "false"
      // For numeric values, use sexpr() which handles both integers and reals
      const stringValue = value.sexpr();
      model[name] = stringValue;
    } catch (_error) {
      // Variable not in model, skip
      continue;
    }
  }

  return model;
}
