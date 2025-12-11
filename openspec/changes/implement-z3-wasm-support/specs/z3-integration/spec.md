## ADDED Requirements

### Requirement: SMT2 Parser for WASM Adapter

The system SHALL parse SMT-LIB 2.0 formulas into an internal representation suitable for execution on the z3-solver JavaScript API.

#### Scenario: Parse declare-const commands
- **WHEN** SMT2 formula contains `(declare-const x Int)` declarations
- **THEN** the parser extracts variable names, types, and creates corresponding declarations

#### Scenario: Parse assert commands
- **WHEN** SMT2 formula contains `(assert (> x 5))` assertions
- **THEN** the parser extracts assertion expressions into executable format

#### Scenario: Parse check-sat commands
- **WHEN** SMT2 formula contains `(check-sat)` command
- **THEN** the parser identifies the satisfiability check requirement

#### Scenario: Parse get-model commands
- **WHEN** SMT2 formula contains `(get-model)` command
- **THEN** the parser identifies the model extraction requirement

#### Scenario: Handle multi-line SMT2 commands
- **WHEN** SMT2 commands span multiple lines with proper S-expression nesting
- **THEN** the parser correctly groups commands by matching parentheses

#### Scenario: Skip comments and empty lines
- **WHEN** SMT2 formula contains comments (`;` prefix) or empty lines
- **THEN** the parser ignores them and continues parsing

#### Scenario: Detect unsupported SMT2 constructs
- **WHEN** SMT2 formula contains unsupported commands or operations
- **THEN** the parser returns a descriptive error indicating the unsupported feature

### Requirement: SMT2 Executor for WASM Adapter

The system SHALL execute parsed SMT2 commands using the z3-solver JavaScript API and return verification results.

#### Scenario: Execute variable declarations
- **WHEN** parser provides variable declarations with types (Int, Bool, Real)
- **THEN** the executor creates corresponding z3-solver constants

#### Scenario: Execute arithmetic assertions
- **WHEN** parser provides assertions with arithmetic operations (+, -, *, <, <=, >, >=, =)
- **THEN** the executor translates them to z3-solver API calls

#### Scenario: Execute logical assertions
- **WHEN** parser provides assertions with logical operations (and, or, not, =>)
- **THEN** the executor translates them to z3-solver API calls

#### Scenario: Check satisfiability
- **WHEN** all assertions are added to the solver
- **THEN** the executor calls `solver.check()` and returns sat/unsat/unknown

#### Scenario: Extract models for sat results
- **WHEN** solver returns `sat` result
- **THEN** the executor extracts variable assignments from the model

#### Scenario: Handle solver timeouts
- **WHEN** solver exceeds configured timeout
- **THEN** the executor terminates execution and returns timeout error

#### Scenario: Report unsupported operations
- **WHEN** executor encounters operations not implemented in z3-solver API binding
- **THEN** the executor returns a descriptive error with suggestion to use native Z3

### Requirement: WASM SMT2 Integration

The Z3WASMAdapter SHALL use the SMT2 parser and executor to provide full theorem proving functionality.

#### Scenario: Execute SMT2 formulas end-to-end
- **WHEN** `executeSMT2()` is called with SMT2 formula string
- **THEN** the adapter parses, executes, and returns verification results

#### Scenario: Return proper verification results
- **WHEN** SMT2 execution completes
- **THEN** the adapter returns `VerificationResult` with result, model, rawOutput, and executionTime

#### Scenario: Maintain backward compatibility
- **WHEN** WASM adapter is used with existing code
- **THEN** it implements the same `Z3Adapter` interface as native adapter

#### Scenario: Handle initialization errors gracefully
- **WHEN** z3-solver package fails to load
- **THEN** the adapter throws `Z3NotAvailableError` with installation instructions

## MODIFIED Requirements

### Requirement: Multi-Environment Z3 Adapter

The system SHALL provide unified Z3 solver adapters that work in Node.js and browser environments with appropriate bindings, with automatic fallback from native to WASM.

#### Scenario: Use native Z3 bindings in Node.js
- **WHEN** the library runs in a Node.js environment
- **THEN** the system attempts to use native Z3 bindings first for optimal performance

#### Scenario: Automatic fallback to WASM in Node.js
- **WHEN** the library runs in a Node.js environment AND native Z3 is not available
- **THEN** the system automatically falls back to Z3 WASM adapter without user intervention

#### Scenario: Use WASM Z3 in browser
- **WHEN** the library runs in a browser environment
- **THEN** the system loads and uses Z3 WASM bindings for in-browser theorem proving

#### Scenario: Automatic environment detection
- **WHEN** the library initializes
- **THEN** the system automatically detects the runtime environment and selects the appropriate Z3 adapter

#### Scenario: Provide clear error when neither available
- **WHEN** neither native Z3 nor WASM is available
- **THEN** the system throws an error with clear installation instructions for the current platform

### Requirement: Z3 Output Parsing

The system SHALL parse Z3 solver output formats reliably across different versions and backends, including WASM adapter results.

#### Scenario: Parse SMT-LIB output format
- **WHEN** native Z3 returns results in SMT-LIB format
- **THEN** the system parses sat/unsat/unknown results and model values correctly

#### Scenario: Parse z3-solver API response objects
- **WHEN** using z3-solver JavaScript API via WASM adapter
- **THEN** the system extracts solver results, models, and error information from API responses

#### Scenario: Handle malformed Z3 output
- **WHEN** Z3 returns unexpected or malformed output
- **THEN** the system detects the issue and returns a parsing error with diagnostic information

## ADDED Requirements

### Requirement: SMT2 Type System Support

The system SHALL support common SMT-LIB 2.0 types and operations required for reasoning queries.

#### Scenario: Support Int (integer) type
- **WHEN** SMT2 declares variables of type Int
- **THEN** the system creates z3-solver integer constants and supports integer operations

#### Scenario: Support Bool (boolean) type
- **WHEN** SMT2 declares variables of type Bool
- **THEN** the system creates z3-solver boolean constants and supports boolean operations

#### Scenario: Support Real (real number) type
- **WHEN** SMT2 declares variables of type Real
- **THEN** the system creates z3-solver real constants and supports real number operations

#### Scenario: Support comparison operations
- **WHEN** SMT2 uses comparison operators (<, <=, >, >=, =, distinct)
- **THEN** the system translates them to equivalent z3-solver API calls

#### Scenario: Support arithmetic operations
- **WHEN** SMT2 uses arithmetic operators (+, -, *, div, mod)
- **THEN** the system translates them to equivalent z3-solver API calls

#### Scenario: Support logical operations
- **WHEN** SMT2 uses logical operators (and, or, not, =>, iff)
- **THEN** the system translates them to equivalent z3-solver API calls

### Requirement: Error Diagnostics for WASM Adapter

The system SHALL provide clear and actionable error messages for WASM adapter failures.

#### Scenario: Report unsupported SMT2 constructs
- **WHEN** WASM adapter encounters unsupported SMT2 syntax
- **THEN** the system returns error with the specific construct and suggestion to use native Z3

#### Scenario: Report parsing errors with position
- **WHEN** SMT2 parsing fails due to syntax errors
- **THEN** the system returns error with line/column position and expected syntax

#### Scenario: Report z3-solver API errors
- **WHEN** z3-solver JavaScript API throws an error
- **THEN** the system wraps it in Z3Error with context about what operation failed

#### Scenario: Suggest native Z3 for better features
- **WHEN** user encounters WASM limitations
- **THEN** the error message includes instructions for installing native Z3

### Requirement: Browser Example Functional Execution

The browser example SHALL demonstrate working neurosymbolic reasoning using Z3 WASM without requiring native Z3 installation.

#### Scenario: Execute reasoning query in browser
- **WHEN** user enters question and context in browser example form
- **THEN** the example uses Z3 WASM adapter to perform actual reasoning and displays results

#### Scenario: Display verification results
- **WHEN** reasoning completes successfully
- **THEN** the browser example shows answer, verification status, proof steps, and execution time

#### Scenario: Handle reasoning errors in browser
- **WHEN** reasoning fails in browser example
- **THEN** the example displays user-friendly error message with troubleshooting suggestions

#### Scenario: Show loading state during reasoning
- **WHEN** reasoning is in progress in browser example
- **THEN** the example disables the button and shows progress indicator

### Requirement: Performance Characteristics for WASM

The system SHALL maintain acceptable performance characteristics for Z3 WASM adapter relative to native Z3.

#### Scenario: Complete typical reasoning queries within reasonable time
- **WHEN** WASM adapter processes standard reasoning queries from the library
- **THEN** execution time is within 2-3x of native Z3 performance for equivalent queries

#### Scenario: Handle timeout configuration
- **WHEN** user configures solver timeout for WASM adapter
- **THEN** the system enforces the timeout and terminates execution if exceeded

#### Scenario: Track and report execution time
- **WHEN** WASM adapter completes execution
- **THEN** the system includes accurate execution time in VerificationResult
