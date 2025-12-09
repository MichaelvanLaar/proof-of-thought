# proof-of-thought Examples

This directory contains usage examples demonstrating different features of the **proof-of-thought** library.

## Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up OpenAI API key**:
   ```bash
   export OPENAI_API_KEY=your-api-key-here
   ```

3. **Install Z3 solver** (if not already installed):
   - macOS: `brew install z3`
   - Ubuntu/Debian: `sudo apt-get install z3`
   - Windows: Download from https://github.com/Z3Prover/z3/releases
   - Or install via npm: `npm install z3-solver`

## Examples

### basic-usage.ts

Demonstrates the fundamental usage of **proof-of-thought**:
- Setting up the instance
- Executing reasoning queries
- Accessing results and proof traces
- Handling different types of logical questions

**Run it**:
```bash
npx tsx examples/basic-usage.ts
```

### self-refine-usage.ts

Demonstrates Self-Refine postprocessing for iterative answer improvement:
- Setting up Self-Refine with custom configuration
- Refining reasoning responses through LLM critique
- Monitoring convergence and satisfaction detection
- Inspecting refinement traces and evolution
- Understanding configuration options (maxIterations, convergenceThreshold)

**Run it**:
```bash
npx tsx examples/self-refine-usage.ts
```

### self-consistency-usage.ts

Demonstrates Self-Consistency postprocessing for answer reliability:
- Generating multiple reasoning paths with temperature sampling
- Using majority voting to select consistent answers
- Using weighted voting based on verification and performance
- Comparing voting methods
- Understanding configuration options (numSamples, temperature, votingMethod)
- Analyzing confidence scores

**Run it**:
```bash
npx tsx examples/self-consistency-usage.ts
```

### decomposed-usage.ts

Demonstrates Decomposed Prompting for breaking down complex questions:
- Decomposing complex questions into simpler sub-questions
- Sequential sub-question solving with context building
- Tracking dependencies between sub-questions
- Combining sub-answers into comprehensive final answers
- Inspecting decomposition traces and proof steps
- Understanding configuration options (maxSubQuestions, decompositionPrompt)
- Comparing decomposed vs direct approaches

**Run it**:
```bash
npx tsx examples/decomposed-usage.ts
```

### Postprocessing Examples

Additional postprocessing examples in the `postprocessing/` directory:

#### self-refine-example.ts

Demonstrates Self-Refine with integrated postprocessing pipeline:
- Automatic iterative refinement through self-critique
- Convergence detection and similarity tracking
- Custom critique prompts and configuration

**Run it**:
```bash
npx tsx examples/postprocessing/self-refine-example.ts
```

#### decomposed-example.ts

Demonstrates Decomposed Prompting with integrated pipeline:
- Automatic question decomposition into sub-questions
- Sequential solving with dependency tracking
- Sub-question combination and synthesis

**Run it**:
```bash
npx tsx examples/postprocessing/decomposed-example.ts
```

#### least-to-most-example.ts

Demonstrates Least-to-Most with integrated pipeline:
- Progressive problem-solving from simple to complex
- Level-based reasoning with context building
- Custom progression prompts

**Run it**:
```bash
npx tsx examples/postprocessing/least-to-most-example.ts
```

### Backend Examples

Examples in the `backends/` directory demonstrate both backend types:

- **smt2-example.ts**: SMT2 backend with formal logic
- **json-example.ts**: JSON DSL backend with structured reasoning

## Coming Soon

More examples will be added for:
- Batch processing
- Custom Z3 configuration
- Browser usage
- Advanced logical reasoning patterns

## Notes

- All examples require a valid OpenAI API key
- Z3 solver must be available (native binary or via npm package)
- Both SMT2 and JSON backends are fully supported
- Verbose logging is enabled by default in examples for educational purposes
