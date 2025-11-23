# Performance Benchmarking Guide

This guide explains how to run performance benchmarks and compare the TypeScript implementation with the Python baseline.

## Quick Start

### Running Benchmarks

Run all benchmarks with default settings:

```bash
npm run benchmark -- --benchmark all
```

Run a specific benchmark:

```bash
npm run benchmark -- --benchmark prontoqa --backend smt2
```

### Benchmark Options

```bash
npm run benchmark -- \
  --benchmark <name>        # prontoqa, folio, proofwriter, conditionalqa, strategyqa, or all
  --backend <type>          # smt2 or json (default: smt2)
  --model <name>            # OpenAI model (default: gpt-4o)
  --temperature <number>    # LLM temperature (default: 0.0)
  --max-tokens <number>     # Max tokens (default: 4096)
  --z3-timeout <ms>         # Z3 timeout in ms (default: 30000)
  --max-tasks <number>      # Limit number of tasks
  --shuffle                 # Shuffle tasks
  --verbose                 # Verbose output
  --output-format <format>  # console, json, markdown, or csv
  --output-file <path>      # Save results to file
  --api-key <key>           # OpenAI API key
```

## Available Benchmarks

### ProntoQA

- **Dataset**: Synthetic reasoning problems
- **Size**: ~1000 tasks
- **Difficulty**: Easy to Medium
- **Focus**: First-order logic reasoning

```bash
npm run benchmark -- --benchmark prontoqa --max-tasks 100
```

### FOLIO

- **Dataset**: First-order logic reasoning
- **Size**: ~500 tasks
- **Difficulty**: Medium to Hard
- **Focus**: Complex logical reasoning

```bash
npm run benchmark -- --benchmark folio
```

### ProofWriter

- **Dataset**: Logical proof generation
- **Size**: ~1200 tasks
- **Difficulty**: Medium
- **Focus**: Multi-step reasoning

```bash
npm run benchmark -- --benchmark proofwriter --backend json
```

### ConditionalQA

- **Dataset**: Conditional reasoning
- **Size**: ~800 tasks
- **Difficulty**: Medium
- **Focus**: If-then reasoning

```bash
npm run benchmark -- --benchmark conditionalqa
```

### StrategyQA

- **Dataset**: Strategy questions
- **Size**: ~2000 tasks
- **Difficulty**: Hard
- **Focus**: Multi-hop reasoning

```bash
npm run benchmark -- --benchmark strategyqa --max-tasks 50
```

## Performance Comparison

### Comparing with Python

If you have Python benchmark results, compare them with TypeScript results:

```bash
# Run TypeScript benchmark and save results
npm run benchmark -- \
  --benchmark prontoqa \
  --output-format json \
  --output-file results/ts-prontoqa.json

# Compare with Python results
npm run benchmark:compare -- \
  --ts-results results/ts-prontoqa.json \
  --python-results results/py-prontoqa.json \
  --format markdown \
  --output comparison-report.md
```

### Comparing with Baseline

Compare current performance against a baseline:

```bash
# Save current results as baseline
npm run benchmark -- --benchmark all --output-file results/baseline.json

# Make changes, then compare
npm run benchmark -- --benchmark all --output-file results/current.json

npm run benchmark:compare -- \
  --baseline results/baseline.json \
  --current results/current.json
```

## Output Formats

### Console Output

Human-readable table format (default):

```bash
npm run benchmark -- --benchmark prontoqa
```

Example output:

```
═══════════════════════════════════════════════════════════════════════════════
  ProntoQA Benchmark Results
═══════════════════════════════════════════════════════════════════════════════

Accuracy: 95.2% (952/1000 correct)
Total Time: 45,230 ms
Average Time: 45.2 ms/task
LLM Time: 35,180 ms (77.8%)
Z3 Time: 8,050 ms (17.8%)

Token Usage:
  Total: 125,340 tokens
  Prompt: 85,230 tokens
  Completion: 40,110 tokens
```

### JSON Output

Machine-readable format for further processing:

```bash
npm run benchmark -- --benchmark prontoqa --output-format json --output-file results.json
```

### Markdown Output

Documentation-friendly format:

```bash
npm run benchmark -- --benchmark all --output-format markdown --output-file RESULTS.md
```

### CSV Output

Spreadsheet-compatible format:

```bash
npm run benchmark -- --benchmark all --output-format csv --output-file results.csv
```

## Performance Metrics

### Key Metrics

- **Accuracy**: Percentage of correct answers
- **Total Time**: Total execution time for all tasks
- **Average Time**: Average time per task
- **LLM Time**: Time spent in LLM API calls
- **Z3 Time**: Time spent in Z3 solver
- **Token Usage**: Total tokens consumed

### Performance Targets

Based on initial benchmarks, the TypeScript implementation aims for:

| Metric | Target | Python Baseline |
|--------|--------|-----------------|
| Accuracy | ≥95% | ~95% |
| Average Time | ≤100ms/task | ~150ms/task |
| Memory Usage | ≤500MB | ~800MB |
| Bundle Size (Browser) | ≤2MB minified | N/A |

## Optimization Strategies

### LLM Performance

- Use **caching** for repeated queries
- Enable **batching** for multiple subquestions
- Optimize **prompt length** to reduce tokens
- Choose appropriate **model** for task complexity

```bash
npm run benchmark -- \
  --benchmark prontoqa \
  --model gpt-4o-mini \  # Faster, cheaper model
  --temperature 0.0      # Deterministic for caching
```

### Z3 Performance

- Use optimized **Z3 profiles**:
  - `fast`: Quick answers (5s timeout)
  - `balanced`: Standard queries (15s timeout)
  - `thorough`: Complex proofs (60s timeout)

```bash
npm run benchmark -- \
  --benchmark proofwriter \
  --z3-timeout 15000  # 15 second timeout
```

### Backend Selection

- **SMT2**: Better for complex logical reasoning
- **JSON**: Better for structured data, browser compatibility

```bash
# Compare backends
npm run benchmark -- --benchmark prontoqa --backend smt2 --output-file smt2.json
npm run benchmark -- --benchmark prontoqa --backend json --output-file json.json

npm run benchmark:compare -- --baseline smt2.json --current json.json
```

## Profiling Performance

### Enable Performance Profiling

```typescript
import { getGlobalProfiler } from '@proof-of-thought/core/utils/performance';

const profiler = getGlobalProfiler();
profiler.enable();

// Run your queries...

// Generate report
console.log(profiler.generateReport());
```

### Analyze Cache Performance

```typescript
import { getGlobalCacheManager } from '@proof-of-thought/core/utils/cache';

const cacheManager = getGlobalCacheManager();

// After running benchmarks
console.log(cacheManager.generateReport());
```

## Continuous Performance Monitoring

### Set Up Baseline

```bash
# Establish baseline with current main branch
git checkout main
npm run benchmark -- --benchmark all --output-file baselines/main.json
```

### Monitor Regressions

```bash
# After making changes
git checkout feature-branch
npm run benchmark -- --benchmark all --output-file results/feature.json

# Compare
npm run benchmark:compare -- \
  --baseline baselines/main.json \
  --current results/feature.json \
  --format markdown \
  --output performance-impact.md
```

### CI Integration

Add to `.github/workflows/benchmark.yml`:

```yaml
name: Performance Benchmarks

on: [pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm run benchmark -- --benchmark all --max-tasks 10 --output-format json --output-file results.json
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: results.json
```

## Troubleshooting

### Rate Limits

If you hit OpenAI rate limits:

```bash
# Reduce concurrency with max-tasks
npm run benchmark -- --benchmark all --max-tasks 10

# Use batching (built-in to the system)
# Requests are automatically batched when possible
```

### Timeout Issues

If Z3 times out frequently:

```bash
# Increase timeout
npm run benchmark -- --benchmark proofwriter --z3-timeout 60000

# Or use faster profile
# (configure in code with Z3Config)
```

### Memory Issues

If running out of memory:

```bash
# Run benchmarks individually
npm run benchmark -- --benchmark prontoqa --output-file prontoqa.json
npm run benchmark -- --benchmark folio --output-file folio.json
# etc.

# Or limit task count
npm run benchmark -- --benchmark all --max-tasks 100
```

## Best Practices

1. **Consistent Environment**: Always run benchmarks on the same hardware
2. **Warm-up Runs**: Run a small benchmark first to warm up caches
3. **Multiple Runs**: Run benchmarks 3-5 times and average results
4. **Baseline Tracking**: Keep historical baseline results
5. **Regression Detection**: Compare each PR against main branch
6. **Document Changes**: Note any code changes that affect performance

## Example Workflow

Complete performance testing workflow:

```bash
#!/bin/bash

# 1. Build project
npm run build

# 2. Run all benchmarks
npm run benchmark -- \
  --benchmark all \
  --max-tasks 100 \
  --output-format json \
  --output-file results/$(date +%Y%m%d)-ts.json

# 3. Compare with Python (if available)
if [ -f results/python-baseline.json ]; then
  npm run benchmark:compare -- \
    --ts-results results/$(date +%Y%m%d)-ts.json \
    --python-results results/python-baseline.json \
    --format markdown \
    --output reports/comparison-$(date +%Y%m%d).md
fi

# 4. Compare with previous TypeScript run
if [ -f results/latest-ts.json ]; then
  npm run benchmark:compare -- \
    --baseline results/latest-ts.json \
    --current results/$(date +%Y%m%d)-ts.json \
    --format console
fi

# 5. Update latest
cp results/$(date +%Y%m%d)-ts.json results/latest-ts.json

echo "✅ Benchmarking complete!"
echo "📊 Results saved to results/$(date +%Y%m%d)-ts.json"
```

## Resources

- [Benchmark README](./README.md) - Benchmark implementation details
- [Validation Guide](./VALIDATION.md) - Benchmark validation methodology
- [Performance Docs](../docs/PERFORMANCE.md) - Detailed performance documentation
- [Python Baseline](https://github.com/DebarghaG/proofofthought) - Original Python implementation
