# API Reference

Complete API documentation for the **proof-of-thought** TypeScript library.

## Table of Contents

- [ProofOfThought Class](#proofofthought-class)
- [Configuration](#configuration)
- [Response Types](#response-types)
- [Backends](#backends)
- [Error Types](#error-types)
- [Type Definitions](#type-definitions)

## ProofOfThought Class

The main class for neurosymbolic reasoning. Note: The class name uses PascalCase following TypeScript conventions, while the package is named `@michaelvanlaar/proof-of-thought`.

### Constructor

```typescript
new ProofOfThought(config: ProofOfThoughtConfig)
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `ProofOfThoughtConfig` | Yes | Configuration object |

**Example:**

```typescript
import OpenAI from 'openai';
import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const pot = new ProofOfThought({
  client,
  backend: 'smt2',
  model: 'gpt-4o',
  temperature: 0.0,
  maxTokens: 4096,
  z3Timeout: 30000,
  verbose: false,
});
```

### Methods

#### query()

Execute a single reasoning query.

```typescript
async query(
  question: string,
  context: string
): Promise<ReasoningResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `question` | `string` | Yes | The question to answer |
| `context` | `string` | Yes | Background information and premises |

**Returns:** `Promise<ReasoningResponse>`

**Example:**

```typescript
const response = await pot.query(
  'Is Socrates mortal?',
  'All humans are mortal. Socrates is human.'
);

console.log(response.answer);      // Natural language answer
console.log(response.isVerified);  // Boolean verification result
console.log(response.proof);       // Array of proof steps
```

**Throws:**
- `ValidationError` - Invalid input (empty question/context)
- `BackendError` - Backend execution failed
- `TranslationError` - Failed to translate to/from formula
- `Z3Error` - Z3 solver error

#### batch()

Process multiple queries efficiently.

```typescript
async batch(
  queries: Array<[string, string]>,
  parallel?: boolean
): Promise<ReasoningResponse[]>
```

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `queries` | `Array<[string, string]>` | Yes | - | Array of [question, context] tuples |
| `parallel` | `boolean` | No | `false` | Process in parallel if true |

**Returns:** `Promise<ReasoningResponse[]>`

**Example:**

```typescript
const queries = [
  ['Question 1', 'Context 1'],
  ['Question 2', 'Context 2'],
  ['Question 3', 'Context 3'],
];

// Sequential processing (more reliable)
const results = await pot.batch(queries, false);

// Parallel processing (faster)
const results = await pot.batch(queries, true);
```

#### getConfig()

Get current configuration.

```typescript
getConfig(): ProofOfThoughtConfig
```

**Returns:** `ProofOfThoughtConfig`

**Example:**

```typescript
const config = pot.getConfig();
console.log(config.backend);     // 'smt2' or 'json'
console.log(config.model);       // 'gpt-4o'
console.log(config.temperature); // 0.0
```

#### getBackendType()

Get the current backend type.

```typescript
getBackendType(): 'smt2' | 'json'
```

**Returns:** `'smt2' | 'json'`

**Example:**

```typescript
console.log(pot.getBackendType()); // 'smt2'
```

#### isInitialized()

Check if the instance is initialized.

```typescript
isInitialized(): boolean
```

**Returns:** `boolean`

**Example:**

```typescript
console.log(pot.isInitialized()); // false (before first query)
await pot.query('test', 'test');
console.log(pot.isInitialized()); // true (after first query)
```

## Configuration

### ProofOfThoughtConfig

```typescript
interface ProofOfThoughtConfig {
  client: OpenAI;              // OpenAI client instance
  backend?: 'smt2' | 'json';   // Backend type (default: 'smt2')
  model?: string;              // OpenAI model (default: 'gpt-4o')
  temperature?: number;        // 0.0-1.0 (default: 0.0)
  maxTokens?: number;          // Max response tokens (default: 4096)
  z3Timeout?: number;          // Z3 timeout in ms (default: 30000)
  verbose?: boolean;           // Enable logging (default: false)
}
```

**Field Descriptions:**

- **client** (required): OpenAI client instance from `openai` package
- **backend**: Reasoning backend
  - `'smt2'`: SMT-LIB 2.0 format (best for formal logic)
  - `'json'`: JSON DSL format (best for complex structures)
- **model**: OpenAI model name
  - Recommended: `'gpt-4o'`, `'gpt-4'`, `'gpt-4-turbo'`
- **temperature**: Randomness in LLM responses
  - `0.0`: Deterministic (recommended)
  - `0.5`: Moderate randomness
  - `1.0`: Maximum randomness
- **maxTokens**: Maximum tokens in LLM response
  - Increase for complex formulas
  - Decrease to save costs
- **z3Timeout**: Z3 solver timeout in milliseconds
  - Increase for complex problems
  - Decrease for faster failures
- **verbose**: Enable debug logging to console

## Response Types

### ReasoningResponse

```typescript
interface ReasoningResponse {
  answer: string;                              // Natural language answer
  formula: string;                             // Logical formula (SMT2 or JSON)
  proof: Array<{                              // Proof trace
    step: number;
    description: string;
  }>;
  backend: 'smt2' | 'json';                   // Backend used
  isVerified: boolean;                         // Z3 verification result
  executionTime: number;                       // Total time in ms
  model?: string;                              // Z3 model (if satisfiable)
}
```

**Example:**

```typescript
{
  answer: "Yes, Socrates is mortal.",
  formula: "(declare-const human_Socrates Bool)...",
  proof: [
    { step: 1, description: "Translating to SMT2 formula" },
    { step: 2, description: "Verifying with Z3 solver" },
    { step: 3, description: "Generating explanation" }
  ],
  backend: "smt2",
  isVerified: true,
  executionTime: 1234,
  model: undefined
}
```

### VerificationResult

```typescript
interface VerificationResult {
  result: 'sat' | 'unsat' | 'unknown';  // Z3 result
  model?: string;                        // Model (if sat)
  executionTime: number;                 // Z3 execution time in ms
  z3Version?: string;                    // Z3 version used
}
```

## Backends

### SMT2Backend

Formal logic backend using SMT-LIB 2.0 format.

**Best for:**
- Formal logical reasoning
- Mathematical proofs
- Theorem verification
- Precise logical inference

**Example Formula:**
```smt2
(declare-const human_Socrates Bool)
(declare-const mortal_Socrates Bool)
(assert (=> (human_Socrates) (mortal_Socrates)))
(assert (human_Socrates))
(check-sat)
```

### JSONBackend

Structured reasoning backend using JSON DSL.

**Best for:**
- Complex nested structures
- Programmatic formula manipulation
- Structured data reasoning
- Custom domain languages

**Example Formula:**
```json
{
  "sorts": { "Person": { "type": "uninterpreted" } },
  "constants": { "Socrates": { "sort": "Person" } },
  "functions": {
    "human": { "params": [...], "return": "Bool" },
    "mortal": { "params": [...], "return": "Bool" }
  },
  "assertions": [...]
}
```

## Error Types

All errors extend `ProofOfThoughtError` (which extends `Error`).

### Error Hierarchy

```
Error
  └─ ProofOfThoughtError
       ├─ ConfigurationError       // Invalid configuration
       ├─ ValidationError          // Input validation failed
       ├─ BackendError             // Backend execution failed
       ├─ TranslationError         // Formula translation failed
       ├─ PostprocessingError      // Postprocessing failed
       ├─ LLMError                 // LLM API call failed
       ├─ ParsingError             // Output parsing failed
       └─ Z3Error                  // Z3 solver errors
            ├─ Z3NotAvailableError // Z3 not found/configured
            └─ Z3TimeoutError      // Z3 timeout exceeded
```

### Error Examples

```typescript
import {
  ConfigurationError,
  ValidationError,
  BackendError,
  Z3Error,
} from '@michaelvanlaar/proof-of-thought';

try {
  const response = await pot.query(question, context);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof BackendError) {
    console.error('Backend failed:', error.message);
    console.error('Backend type:', error.backend);
  } else if (error instanceof Z3Error) {
    console.error('Z3 error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Type Definitions

### Branded Types

```typescript
// Formula types are branded for type safety
type SMT2Formula = string & { readonly brand: unique symbol };
type JSONFormula = string & { readonly brand: unique symbol };
```

### Backend Interface

```typescript
interface Backend {
  translate(question: string, context: string): Promise<Formula>;
  verify(formula: Formula): Promise<VerificationResult>;
  explain(
    result: VerificationResult,
    question: string,
    context: string
  ): Promise<string>;
}
```

### Z3 Adapter Interface

```typescript
interface Z3Adapter {
  initialize(): Promise<void>;
  verify(formula: SMT2Formula): Promise<VerificationResult>;
  checkAvailability(): Promise<boolean>;
  getVersion(): Promise<string>;
  dispose(): Promise<void>;
}
```

## Advanced Usage

### Custom OpenAI Client

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'your-org-id',
  baseURL: 'https://custom-endpoint.com',
  timeout: 60000,
  maxRetries: 3,
});

const pot = new ProofOfThought({ client });
```

### Azure OpenAI

```typescript
const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${endpoint}/openai/deployments/${deployment}`,
  defaultQuery: { 'api-version': '2024-02-15-preview' },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
});

const pot = new ProofOfThought({
  client,
  model: deployment, // Use deployment name
});
```

### Error Handling with Retry

```typescript
async function reasonWithRetry(
  pot: ProofOfThought,
  question: string,
  context: string,
  maxRetries = 3
): Promise<ReasoningResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pot.query(question, context);
    } catch (error) {
      if (error instanceof Z3TimeoutError && attempt < maxRetries) {
        console.log(`Retry ${attempt}/${maxRetries}`);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Performance Monitoring

```typescript
const startTime = Date.now();
const response = await pot.query(question, context);
const totalTime = Date.now() - startTime;

console.log(`Total time: ${totalTime}ms`);
console.log(`Z3 time: ${response.executionTime}ms`);
console.log(`LLM time: ${totalTime - response.executionTime}ms`);
```

## See Also

- [Getting Started Guide](GETTING_STARTED.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [Migration Guide](MIGRATION.md)
- [Examples](../examples/README.md)
- [Troubleshooting](TROUBLESHOOTING.md)
