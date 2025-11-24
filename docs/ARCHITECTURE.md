# proof-of-thought Architecture

This document describes the architecture and design of the **proof-of-thought** TypeScript implementation.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Diagram](#component-diagram)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Backend Architecture](#backend-architecture)
- [Postprocessing Pipeline](#postprocessing-pipeline)
- [Z3 Integration](#z3-integration)
- [Type System](#type-system)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Browser Architecture](#browser-architecture)
- [Extension Points](#extension-points)

## Overview

**proof-of-thought** is a TypeScript neurosymbolic reasoning library (a port of the original ProofOfThought Python library) that combines:

1. **LLM Translation** - Natural language → Formal logic (via GPT-5.1)
2. **Formal Verification** - Theorem proving (via Z3 solver)
3. **Natural Language Explanation** - Formal results → Human-readable answers
4. **Postprocessing** - Optional enhancement methods for improved accuracy

The architecture follows a modular, pipeline-based design with clear separation of concerns.

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  proof-of-thought                        │
│                   (Main Orchestrator)                    │
└───────────────────┬──────────────────────────────────────┘
                    │
         ┌──────────┴──────────┬────────────────┐
         │                     │                │
         ▼                     ▼                ▼
  ┌──────────┐         ┌──────────┐    ┌──────────────┐
  │ OpenAI   │         │ Backend  │    │Postprocessing│
  │ Client   │         │(SMT2/JSON)│    │  Methods     │
  └──────────┘         └─────┬────┘    └──────────────┘
                             │
                             ▼
                       ┌──────────┐
                       │Z3 Adapter│
                       └─────┬────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
                   ▼                   ▼
            ┌──────────┐        ┌──────────┐
            │Z3 Native │        │ Z3 WASM  │
            │(Node.js) │        │(Browser) │
            └──────────┘        └──────────┘
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Code                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────────┐
         │     ProofOfThought Class            │
         │  - Configuration management          │
         │  - Query orchestration               │
         │  - Postprocessing coordination       │
         └─────────────┬───────────────────────┘
                       │
         ┌─────────────┴───────────────┬──────────────┐
         │                             │              │
         ▼                             ▼              ▼
┌──────────────┐             ┌──────────────┐  ┌────────────┐
│   Backend    │             │Postprocessing│  │  Adapters  │
│   Layer      │             │    Layer     │  │   Layer    │
├──────────────┤             ├──────────────┤  ├────────────┤
│ SMT2Backend  │             │ SelfRefine   │  │Z3Native    │
│ JSONBackend  │             │SelfConsistency│ │Z3WASM      │
│              │             │ Decomposed   │  │            │
│ - translate()│             │ LeastToMost  │  │- execute() │
│ - verify()   │             │              │  │- parse()   │
│ - explain()  │             │              │  │            │
└──────┬───────┘             └──────────────┘  └─────┬──────┘
       │                                              │
       └──────────────────┬──────────────────────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │   Z3 Solver    │
                  │ (Native/WASM)  │
                  └────────────────┘
```

## Core Components

### 1. ProofOfThought (Main Orchestrator)

**Location:** `src/reasoning/proof-of-thought.ts`

**Responsibilities:**
- Initialize and configure backends
- Coordinate query execution
- Manage postprocessing pipeline
- Handle batch processing
- Collect metrics and timing

**Key Methods:**
```typescript
class ProofOfThought {
  constructor(config: ProofOfThoughtConfig)

  async query(question: string, context?: string): Promise<ReasoningResponse>
  async batch(queries: Array<[string, string?]>, parallel?: boolean): Promise<ReasoningResponse[]>

  getConfig(): ProofOfThoughtConfig
  isInitialized(): boolean
  getBackendType(): 'smt2' | 'json'
}
```

**Initialization Flow:**
```
ProofOfThought.constructor()
    ↓
Validate config
    ↓
Store configuration
    ↓
Lazy initialization
    ↓
(on first query)
    ↓
Initialize Z3 adapter
    ↓
Create backend instance
    ↓
Initialize postprocessing methods (if configured)
```

### 2. Backend Layer

Backends handle translation, verification, and explanation phases.

#### SMT2Backend

**Location:** `src/backends/smt2-backend.ts`

**Responsibilities:**
- Translate natural language to SMT-LIB 2.0
- Execute SMT2 formulas via Z3
- Generate natural language explanations

**Translation Process:**
```
Natural Language Input
    ↓
LLM System Prompt (SMT2 expert persona)
    ↓
GPT-5.1 Translation
    ↓
Extract SMT2 from response
    ↓
Validate syntax (parentheses, commands)
    ↓
Return branded SMT2Formula
```

#### JSONBackend

**Location:** `src/backends/json-backend.ts`

**Responsibilities:**
- Translate natural language to JSON DSL
- Execute JSON programs via Z3 interpreter
- Generate explanations from results

**JSON DSL Structure:**
```typescript
interface JSONProgram {
  sorts: Record<string, SortDefinition>;
  functions: Record<string, FunctionDeclaration>;
  constants: Record<string, string>;
  knowledge_base: string[];
  rules?: Rule[];
  verifications: Record<string, string>;
}
```

**Execution Flow:**
```
JSON Program
    ↓
Validate schema
    ↓
Z3JSONInterpreter
    ↓
Create Z3 context
    ↓
Declare sorts, functions, constants
    ↓
Assert knowledge base facts
    ↓
Check verification queries
    ↓
Extract model (if SAT)
    ↓
Return VerificationResult
```

### 3. Z3 Adapter Layer

Provides environment-specific Z3 integration.

#### Z3NativeAdapter

**Location:** `src/adapters/z3-native.ts`

**Responsibilities:**
- Execute Z3 via CLI or z3-solver package
- Parse Z3 output
- Handle timeouts and errors

**Execution Methods:**
- **Package API:** Use z3-solver npm package (when available)
- **CLI Execution:** Spawn z3 process, pipe formula to stdin
- **Output Parsing:** Extract sat/unsat/unknown, parse models

#### Z3WASMAdapter

**Location:** `src/adapters/z3-wasm.ts`

**Responsibilities:**
- Load Z3 WASM module
- Execute formulas in browser
- Manage WASM memory

**Browser Integration:**
```
Load WASM from URL
    ↓
WebAssembly.compile()
    ↓
Instantiate with imports
    ↓
Allocate memory for strings
    ↓
Call Z3 API functions
    ↓
Extract results from memory
```

### 4. Postprocessing Layer

Optional methods to enhance reasoning quality.

#### SelfRefine

**Location:** `src/postprocessing/self-refine.ts`

**Algorithm:**
```
Initial answer
    ↓
┌─────────────────┐
│  Iteration i    │
│                 │
│  1. Critique    │◄──┐
│  2. Improve     │   │
│  3. Check       │   │
│     convergence │   │
└────────┬────────┘   │
         │            │
         ├─No─────────┘
         │
        Yes
         │
         ▼
   Final answer
```

#### SelfConsistency

**Location:** `src/postprocessing/self-consistency.ts`

**Algorithm:**
```
Generate N paths (with temperature > 0)
    ↓
Path 1: Answer A
Path 2: Answer B
Path 3: Answer A
Path 4: Answer C
Path 5: Answer A
    ↓
Majority voting or Weighted voting
    ↓
Select most consistent answer (A)
    ↓
Confidence = votes(A) / N = 3/5 = 0.6
```

#### Decomposed Prompting

**Location:** `src/postprocessing/decomposed.ts`

**Algorithm:**
```
Complex question
    ↓
Decompose into sub-questions
    ↓
Sub-Q1 (simple)
    ↓
Solve → Answer 1
    ↓
Sub-Q2 (depends on Q1)
    ↓
Solve with A1 as context → Answer 2
    ↓
Sub-Q3 (depends on Q1, Q2)
    ↓
Solve with A1, A2 as context → Answer 3
    ↓
Synthesize final answer
```

#### Least-to-Most Prompting

**Location:** `src/postprocessing/least-to-most.ts`

**Algorithm:**
```
Complex problem
    ↓
Identify progression levels
    ↓
Level 1: Simplest sub-problem
    ↓
Solve → Solution 1
    ↓
Level 2: Medium complexity
    ↓
Solve using S1 → Solution 2
    ↓
Level 3: Full complexity
    ↓
Solve using S1, S2 → Solution 3
    ↓
Synthesize final answer
```

## Data Flow

### Complete Query Flow

```
User → pot.query(question, context)
    ↓
ProofOfThought.initialize() (if needed)
    ↓
Check postprocessing configuration
    ↓
┌─────────────────────────────────────────┐
│         Base Reasoning Flow             │
│                                         │
│  1. Backend.translate()                 │
│     ├─ Build prompt                     │
│     ├─ Call OpenAI API                  │
│     ├─ Extract formula                  │
│     └─ Validate syntax                  │
│                                         │
│  2. Backend.verify()                    │
│     ├─ Z3Adapter.executeSMT2/JSON()     │
│     ├─ Spawn Z3 process                 │
│     ├─ Parse output                     │
│     └─ Return VerificationResult        │
│                                         │
│  3. Backend.explain()                   │
│     ├─ Build explanation prompt         │
│     ├─ Call OpenAI API                  │
│     └─ Return natural language          │
│                                         │
│  4. Build ReasoningResponse             │
│     ├─ Combine all steps                │
│     ├─ Record proof trace               │
│     └─ Calculate execution time         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
    ┌─────────────────────────┐
    │  Postprocessing? (Optional) │
    └─────────────┬───────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
   Apply methods    Skip postprocessing
   (SelfRefine,           │
   SelfConsistency,       │
   Decomposed,            │
   LeastToMost)           │
         │                │
         └────────┬───────┘
                  │
                  ▼
         Enhanced response
                  │
                  ▼
    Return to user
```

### Proof Trace Construction

Each step in the reasoning process is recorded:

```typescript
interface ReasoningStep {
  step: number;
  description: string;
  prompt?: string;
  response?: string;
  formula?: string;
  solverOutput?: string;
}
```

**Example Proof Trace:**
```
Step 1: Translating natural language to formal logic
Step 2: Generated formal logic formula
  formula: "(declare-const Socrates Entity) ..."
Step 3: Verifying formula with Z3 theorem prover
Step 4: Verification complete: SAT
  solverOutput: "sat\n(model ..."
Step 5: Generating natural language explanation
Step 6: Explanation generated
  response: "Yes, Socrates is mortal because..."
Step 7: Self-Refine iteration 1: Improved answer
Step 8: Self-Refine completed after 2 iteration(s)
```

## Backend Architecture

### Backend Interface

All backends implement a common interface:

```typescript
interface Backend {
  readonly type: BackendType;

  translate(question: string, context: string): Promise<Formula>;
  verify(formula: Formula): Promise<VerificationResult>;
  explain(result: VerificationResult): Promise<string>;
}
```

### Formula Type Safety

Branded types prevent mixing formula types:

```typescript
type SMT2Formula = string & { readonly __brand: 'SMT2Formula' };
type JSONFormula = object & { readonly __brand: 'JSONFormula' };
type Formula = SMT2Formula | JSONFormula;
```

This ensures SMT2 formulas aren't accidentally passed to JSON backend and vice versa.

### Verification Result Structure

```typescript
interface VerificationResult {
  result: 'sat' | 'unsat' | 'unknown';
  model?: Record<string, unknown>;
  rawOutput: string;
  executionTime: number;
  error?: string;
}
```

## Postprocessing Pipeline

### Pipeline Architecture

```
Base Response
    ↓
┌──────────────────┐
│  Postprocessing  │
│   Coordinator    │
└────────┬─────────┘
         │
    For each method:
         │
         ├─→ SelfRefine?
         │       ↓
         │   Refine answer
         │       ↓
         ├─→ Decomposed?
         │       ↓
         │   Decompose & solve
         │       ↓
         ├─→ LeastToMost?
         │       ↓
         │   Progressive solve
         │       ↓
         └─→ Continue
                 │
                 ▼
         Enhanced Response
```

### Method Coordination

- **Sequential Application:** Methods applied in order specified
- **Error Handling:** Failures fallback to previous result
- **Metrics Tracking:** Execution time, iterations, samples recorded
- **Proof Integration:** Steps from each method added to proof trace

### Self-Consistency Integration

Self-Consistency is special - it generates multiple reasoning paths:

```
pot.query() with self-consistency
    ↓
SelfConsistency.apply()
    ↓
Generate N paths in parallel
    ↓
Each path goes through full reasoning:
  - translate()
  - verify()
  - explain()
    ↓
Aggregate results via voting
    ↓
Select best response
    ↓
Return with confidence score
```

## Z3 Integration

### Adapter Factory

**Location:** `src/adapters/utils.ts`

```typescript
function createZ3Adapter(config?: {
  timeout?: number;
  z3Path?: string;
}): Z3Adapter {
  // Browser: Use WASM
  if (typeof window !== 'undefined') {
    return new Z3WASMAdapter(config);
  }

  // Node.js: Use native
  return new Z3NativeAdapter(config);
}
```

### Execution Modes

**Node.js:**
1. **z3-solver package** (preferred)
   - Direct API access
   - Fastest execution
   - Memory management

2. **CLI execution** (fallback)
   - Spawn z3 process
   - Pipe formula to stdin
   - Parse stdout

**Browser:**
1. **WASM execution**
   - Load Z3 WASM module
   - WebAssembly.instantiate()
   - Memory-based string passing

### Timeout Handling

```
Start execution
    ↓
setTimeout(timeout_duration)
    ↓
Z3 execution
    ↓
┌─────────┴──────────┐
│                    │
Complete before      Timeout expires
timeout                  │
│                        ▼
│                   Kill process
│                   Throw Z3TimeoutError
│
└─────────┬──────────┘
          │
    Return result
```

## Type System

### Core Types

**Location:** `src/types/index.ts`

```typescript
// Configuration
interface ProofOfThoughtConfig { ... }
interface SelfRefineConfig { ... }
interface SelfConsistencyConfig { ... }
interface DecomposedConfig { ... }
interface LeastToMostConfig { ... }

// Responses
interface ReasoningResponse { ... }
interface ReasoningStep { ... }
interface VerificationResult { ... }

// Formulas
type SMT2Formula = string & { readonly __brand: 'SMT2Formula' };
type JSONFormula = object & { readonly __brand: 'JSONFormula' };

// Interfaces
interface Backend { ... }
interface Z3Adapter { ... }
```

### Type Guards

```typescript
function isSMT2Backend(backend: Backend): backend is SMT2Backend {
  return backend.type === 'smt2';
}

function isJSONBackend(backend: Backend): backend is JSONBackend {
  return backend.type === 'json';
}
```

## Error Handling

### Error Hierarchy

```
ProofOfThoughtError (base)
    ├── LLMError
    ├── Z3Error
    │   ├── Z3TimeoutError
    │   └── Z3NotAvailableError
    ├── ValidationError
    ├── ConfigurationError
    ├── BackendError
    ├── TranslationError
    ├── PostprocessingError
    └── ParsingError
```

### Error Propagation

```
Query execution
    ↓
Try translate()
    ├─ Success → Continue
    └─ Error → Throw TranslationError
        ↓
Try verify()
    ├─ Success → Continue
    ├─ Timeout → Throw Z3TimeoutError
    └─ Error → Throw Z3Error
        ↓
Try explain()
    ├─ Success → Continue
    └─ Error → Use fallback explanation
        ↓
Try postprocessing
    ├─ Success → Enhanced result
    └─ Error → Log warning, use base result
        ↓
Return result or propagate error
```

### Error Recovery

- **LLM Errors:** Retry if retryable (429, 503)
- **Z3 Timeout:** User can increase timeout and retry
- **Postprocessing Errors:** Fallback to base result
- **Explanation Errors:** Use generated fallback

## Performance Considerations

### Lazy Initialization

Components initialized on first use:
- Z3 adapter created when first query runs
- Backend instantiated during initialization
- Postprocessing methods created when configured

### Parallel Batch Processing

```typescript
// Sequential (default)
for (const query of queries) {
  results.push(await pot.query(...query));
}

// Parallel (faster)
const promises = queries.map(query => pot.query(...query));
const results = await Promise.all(promises);
```

**Trade-offs:**
- **Parallel:** Faster total time, higher memory, potential rate limits
- **Sequential:** Slower, lower memory, reliable

### Caching Opportunities

Future optimization points:
- LLM response caching (identical questions)
- Formula caching (identical translations)
- Z3 result caching (identical formulas)

### Memory Management

- Streaming not used (formulas typically small)
- Z3 output buffered in memory
- WASM memory configurable (initial/maximum pages)

## Browser Architecture

### WASM Integration

```
Browser Application
    ↓
Import from '@michaelvanlaar/proof-of-thought/browser'
    ↓
Z3WASMAdapter
    ↓
Fetch WASM file (CDN or local)
    ↓
WebAssembly.compile()
    ↓
WebAssembly.instantiate()
    ↓
Z3 API available
    ↓
Execute formulas in-browser
```

### Security Considerations

- CORS: WASM file must be served with correct headers
- CSP: May need `wasm-unsafe-eval` directive
- Size: WASM bundle ~8MB (consider lazy loading)

## Extension Points

### Custom Backends

Implement the `Backend` interface:

```typescript
class CustomBackend implements Backend {
  readonly type = 'custom' as const;

  async translate(question: string, context: string): Promise<Formula> {
    // Your translation logic
  }

  async verify(formula: Formula): Promise<VerificationResult> {
    // Your verification logic
  }

  async explain(result: VerificationResult): Promise<string> {
    // Your explanation logic
  }
}

const pot = new ProofOfThought({
  client,
  backend: new CustomBackend()
});
```

### Custom Z3 Adapters

Implement the `Z3Adapter` interface:

```typescript
class CustomZ3Adapter implements Z3Adapter {
  async initialize(): Promise<void> { ... }
  async executeSMT2(formula: string): Promise<VerificationResult> { ... }
  async executeJSON(formula: object): Promise<VerificationResult> { ... }
  async isAvailable(): Promise<boolean> { ... }
  async getVersion(): Promise<string> { ... }
  async dispose(): Promise<void> { ... }
}
```

### Custom Postprocessing

While not directly extensible via interface, you can:
1. Fork and add new methods to the postprocessing layer
2. Apply postprocessing externally to `ReasoningResponse`
3. Submit PR to add new method to core library

## Summary

ProofOfThought's architecture is designed for:

- **Modularity:** Clear separation of concerns
- **Extensibility:** Custom backends and adapters
- **Type Safety:** Comprehensive TypeScript types
- **Performance:** Lazy initialization, parallel processing
- **Flexibility:** Multiple backends, postprocessing methods
- **Portability:** Node.js and browser support
- **Robustness:** Comprehensive error handling

The neurosymbolic approach combines the best of both worlds:
- LLMs for natural language understanding
- Z3 for formal verification and logical soundness

This architecture ensures accurate, interpretable, and verifiable reasoning.
