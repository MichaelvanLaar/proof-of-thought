/**
 * SMT2 Parser - Parse SMT-LIB 2.0 formulas into AST
 *
 * This parser converts SMT-LIB 2.0 text format into an internal AST representation
 * that can be executed using the z3-solver JavaScript API.
 *
 * Supported SMT2 constructs:
 * - Commands: declare-const, declare-fun, assert, check-sat, get-model, set-logic
 * - Types: Int, Bool, Real
 * - Operations: +, -, *, div, mod, <, <=, >, >=, =, distinct, and, or, not, =>, iff
 */

/**
 * SMT2 expression types
 */
export type SMT2Expr =
  | { type: 'var'; name: string }
  | { type: 'const'; value: number | boolean }
  | { type: 'app'; op: string; args: SMT2Expr[] };

/**
 * SMT2 type representations
 */
export type SMT2Type =
  | 'Int'
  | 'Bool'
  | 'Real'
  | { type: 'func'; params: SMT2Type[]; return: SMT2Type };

/**
 * SMT2 command types
 */
export type SMT2Command =
  | { type: 'declare-const'; name: string; sort: SMT2Type }
  | { type: 'declare-fun'; name: string; params: SMT2Type[]; return: SMT2Type }
  | { type: 'assert'; expr: SMT2Expr }
  | { type: 'check-sat' }
  | { type: 'get-model' }
  | { type: 'set-logic'; logic: string };

/**
 * Parse error with position information
 */
export class SMT2ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'SMT2ParseError';
  }
}

/**
 * Unsupported SMT2 construct error
 */
export class SMT2UnsupportedError extends Error {
  constructor(
    public construct: string,
    message?: string
  ) {
    super(
      message ||
        `Unsupported SMT2 construct: ${construct}\n` +
          'Suggestion: Install native Z3 for advanced SMT2 features:\n' +
          '  macOS: brew install z3\n' +
          '  Linux: sudo apt-get install z3'
    );
    this.name = 'SMT2UnsupportedError';
  }
}

/**
 * Tokenizer for S-expressions
 */
class Tokenizer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Array<{ value: string; line: number; column: number }> = [];

  constructor(private input: string) {
    this.tokenize();
  }

  private tokenize(): void {
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (!char) break;

      // Skip whitespace
      if (/\s/.test(char)) {
        if (char === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.pos++;
        continue;
      }

      // Skip comments
      if (char === ';') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
        continue;
      }

      const line = this.line;
      const column = this.column;

      // Parentheses
      if (char === '(' || char === ')') {
        this.tokens.push({ value: char, line, column });
        this.pos++;
        this.column++;
        continue;
      }

      // Symbols (atoms)
      let symbol = '';
      while (this.pos < this.input.length) {
        const c = this.input[this.pos];
        if (!c || /[\s()]/.test(c) || c === ';') break;
        symbol += c;
        this.pos++;
        this.column++;
      }

      if (symbol) {
        this.tokens.push({ value: symbol, line, column });
      }
    }
  }

  getTokens() {
    return this.tokens;
  }
}

/**
 * Parser for SMT2 commands
 */
class Parser {
  private pos = 0;

  constructor(private tokens: Array<{ value: string; line: number; column: number }>) {}

  parse(): SMT2Command[] {
    const commands: SMT2Command[] = [];

    while (this.pos < this.tokens.length) {
      commands.push(this.parseCommand());
    }

    return commands;
  }

  private current() {
    return this.tokens[this.pos];
  }

  // Removed unused peek method

  private consume(expected?: string): { value: string; line: number; column: number } {
    const token = this.current();
    if (!token) {
      const prev = this.tokens[this.pos - 1];
      throw new SMT2ParseError('Unexpected end of input', prev?.line ?? 1, prev?.column ?? 1);
    }
    if (expected && token.value !== expected) {
      throw new SMT2ParseError(
        `Expected '${expected}', got '${token.value}'`,
        token.line,
        token.column
      );
    }
    this.pos++;
    return token;
  }

  private parseCommand(): SMT2Command {
    this.consume('(');
    const cmdToken = this.consume();
    const cmd = cmdToken?.value ?? '';

    let result: SMT2Command;

    switch (cmd) {
      case 'declare-const':
        result = this.parseDeclareConst();
        break;

      case 'declare-fun':
        result = this.parseDeclareFun();
        break;

      case 'assert':
        result = this.parseAssert();
        break;

      case 'check-sat':
        result = { type: 'check-sat' };
        break;

      case 'get-model':
        result = { type: 'get-model' };
        break;

      case 'set-logic':
        result = this.parseSetLogic();
        break;

      default:
        throw new SMT2UnsupportedError(cmd, `Unsupported command: ${cmd}`);
    }

    this.consume(')');
    return result;
  }

  private parseDeclareConst(): SMT2Command {
    const name = this.consume().value ?? 'unknown';
    const sort = this.parseType();
    return { type: 'declare-const', name, sort };
  }

  private parseDeclareFun(): SMT2Command {
    const name = this.consume().value ?? 'unknown';

    // Parse parameter types
    this.consume('(');
    const params: SMT2Type[] = [];
    while (this.current()?.value !== ')') {
      params.push(this.parseType());
    }
    this.consume(')');

    // Parse return type
    const returnType = this.parseType();

    return { type: 'declare-fun', name, params, return: returnType };
  }

  private parseAssert(): SMT2Command {
    const expr = this.parseExpr();
    return { type: 'assert', expr };
  }

  private parseSetLogic(): SMT2Command {
    const logic = this.consume().value ?? 'UNKNOWN';
    return { type: 'set-logic', logic };
  }

  private parseType(): SMT2Type {
    const token = this.current();

    if (token?.value === '(') {
      // Function type (currently not fully supported)
      throw new SMT2UnsupportedError('function types', 'Function types not yet supported');
    }

    const typeStr = this.consume().value ?? 'Unknown';

    if (typeStr === 'Int' || typeStr === 'Bool' || typeStr === 'Real') {
      return typeStr;
    }

    throw new SMT2UnsupportedError(typeStr, `Unsupported type: ${typeStr}`);
  }

  private parseExpr(): SMT2Expr {
    const token = this.current();

    // Atom (variable or constant)
    if (token?.value !== '(') {
      const value = this.consume().value;

      // Boolean constants
      if (value === 'true') return { type: 'const', value: true };
      if (value === 'false') return { type: 'const', value: false };

      // Numeric constants
      if (/^-?\d+$/.test(value)) {
        return { type: 'const', value: parseInt(value, 10) };
      }
      if (/^-?\d+\.\d+$/.test(value)) {
        return { type: 'const', value: parseFloat(value) };
      }

      // Variable
      return { type: 'var', name: value };
    }

    // Application (operator with arguments)
    this.consume('(');
    const op = this.consume().value ?? 'unknown';
    const args: SMT2Expr[] = [];

    while (this.current()?.value !== ')') {
      args.push(this.parseExpr());
    }

    this.consume(')');

    // Validate supported operations
    this.validateOperation(op);

    return { type: 'app', op, args };
  }

  private validateOperation(op: string): void {
    const supported = [
      // Arithmetic
      '+',
      '-',
      '*',
      'div',
      'mod',
      // Comparison
      '<',
      '<=',
      '>',
      '>=',
      '=',
      'distinct',
      // Logical
      'and',
      'or',
      'not',
      '=>',
      'iff',
      // Special
      'ite', // if-then-else
    ];

    if (!supported.includes(op)) {
      throw new SMT2UnsupportedError(op, `Unsupported operation: ${op}`);
    }
  }
}

/**
 * Simple LRU cache for parsed formulas
 */
class ParseCache {
  private cache = new Map<string, SMT2Command[]>();
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): SMT2Command[] | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: SMT2Command[]): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global parse cache (module-level singleton)
const parseCache = new ParseCache(100);

/**
 * Parse SMT2 formula string into AST with caching
 *
 * This function caches parsed formulas to improve performance for repeated queries.
 * The cache uses an LRU eviction policy with a maximum size of 100 entries.
 *
 * @param formula - SMT-LIB 2.0 formula as string
 * @returns Array of parsed commands
 * @throws {SMT2ParseError} If syntax error in formula
 * @throws {SMT2UnsupportedError} If unsupported SMT2 construct
 */
export function parseSMT2(formula: string): SMT2Command[] {
  // Check cache first
  const cached = parseCache.get(formula);
  if (cached !== undefined) {
    return cached;
  }

  // Parse and cache
  const tokenizer = new Tokenizer(formula);
  const tokens = tokenizer.getTokens();
  const parser = new Parser(tokens);
  const commands = parser.parse();

  parseCache.set(formula, commands);
  return commands;
}

/**
 * Clear the formula parse cache
 * Useful for testing or to free memory
 */
export function clearParseCache(): void {
  parseCache.clear();
}

/**
 * Get the current size of the parse cache
 * Useful for monitoring cache usage
 */
export function getParseCacheSize(): number {
  return parseCache.size;
}
