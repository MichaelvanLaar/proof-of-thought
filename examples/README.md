# ProofOfThought Examples

This directory contains usage examples demonstrating different features of the ProofOfThought library.

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

Demonstrates the fundamental usage of ProofOfThought:
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

## Coming Soon

More examples will be added for:
- Batch processing
- Additional postprocessing methods (self-consistency, decomposed prompting)
- Custom Z3 configuration
- Browser usage
- Advanced logical reasoning

## Notes

- All examples require a valid OpenAI API key
- Z3 solver must be available (native binary or via npm package)
- Examples use the SMT2 backend (JSON backend coming soon)
- Verbose logging is enabled by default for educational purposes
