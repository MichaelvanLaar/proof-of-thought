# Benchmark Validation Guide

This guide explains how to validate the TypeScript implementation against the original Python ProofOfThought benchmarks.

## Prerequisites

1. TypeScript implementation installed and built
2. Python implementation available (clone from https://github.com/DebarghaG/proofofthought)
3. OpenAI API key configured
4. Z3 solver installed

## Validation Process

### Step 1: Run Python Benchmarks

Clone and set up the Python implementation:

```bash
# Clone Python implementation
git clone https://github.com/DebarghaG/proofofthought.git python-proofofthought
cd python-proofofthought

# Install dependencies
pip install -r requirements.txt

# Set API key
export OPENAI_API_KEY="your-key-here"

# Run benchmarks
python experiments_pipeline.py
```

This will generate results in `python-proofofthought/results/`.

### Step 2: Run TypeScript Benchmarks

In the TypeScript implementation:

```bash
# Set API key
export OPENAI_API_KEY="your-key-here"

# Run all benchmarks with same configuration
npm run benchmark -- \
  --benchmark all \
  --backend smt2 \
  --model gpt-4o \
  --temperature 0.0 \
  --output-format json \
  --output-file results/ts-{benchmark}-smt2.json

# Repeat for JSON backend
npm run benchmark -- \
  --benchmark all \
  --backend json \
  --output-format json \
  --output-file results/ts-{benchmark}-json.json
```

### Step 3: Compare Results

Create a comparison script (`scripts/compare-results.js`):

```javascript
import { readFileSync } from 'fs';

function compareResults(pyFile, tsFile) {
  const pyResults = JSON.parse(readFileSync(pyFile, 'utf-8'));
  const tsResults = JSON.parse(readFileSync(tsFile, 'utf-8'));

  console.log('Comparison Report');
  console.log('='.repeat(80));
  console.log(`Python Accuracy:    ${(pyResults.accuracy * 100).toFixed(2)}%`);
  console.log(`TypeScript Accuracy: ${(tsResults.metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`Difference:         ${((tsResults.metrics.accuracy - pyResults.accuracy) * 100).toFixed(2)}%`);
  console.log('');
  console.log(`Python F1 Score:    ${(pyResults.f1_score * 100).toFixed(2)}%`);
  console.log(`TypeScript F1 Score: ${(tsResults.metrics.f1Score * 100).toFixed(2)}%`);
  console.log(`Difference:         ${((tsResults.metrics.f1Score - pyResults.f1_score) * 100).toFixed(2)}%`);
}

// Usage: node scripts/compare-results.js python-results.json ts-results.json
compareResults(process.argv[2], process.argv[3]);
```

Run comparison:

```bash
node scripts/compare-results.js \
  python-proofofthought/results/prontoqa-smt2.json \
  results/ts-prontoqa-smt2.json
```

## Expected Results

Based on the original paper, expected accuracy ranges:

### ProntoQA
- **Python SMT2**: ~95-98% accuracy
- **Python JSON**: ~93-96% accuracy
- **Target for TS**: Within ±2% of Python results

### FOLIO
- **Python SMT2**: ~85-90% accuracy
- **Python JSON**: ~82-87% accuracy
- **Target for TS**: Within ±3% of Python results

### ProofWriter
- **Python SMT2**: ~90-95% accuracy (depth 1-2)
- **Python JSON**: ~87-92% accuracy
- **Target for TS**: Within ±2% of Python results

### ConditionalQA
- **Python SMT2**: ~88-93% accuracy
- **Python JSON**: ~85-90% accuracy
- **Target for TS**: Within ±3% of Python results

### StrategyQA
- **Python SMT2**: ~75-82% accuracy
- **Python JSON**: ~72-78% accuracy
- **Target for TS**: Within ±4% of Python results

## Acceptable Differences

Small differences between Python and TypeScript implementations are expected due to:

1. **Non-determinism in LLM responses** (even with temperature=0)
2. **Floating-point arithmetic differences**
3. **Z3 solver version differences**
4. **Timing-related variations**

### Acceptable Variance
- **Accuracy**: ±2-4% difference is acceptable
- **F1 Score**: ±2-4% difference is acceptable
- **Execution Time**: 10-30% variance is normal

### Investigating Large Differences

If differences exceed acceptable variance:

1. **Check Configuration**
   - Verify same model (gpt-4o vs gpt-4)
   - Verify same temperature (0.0)
   - Verify same backend (smt2 vs json)

2. **Check Data**
   - Ensure using same benchmark datasets
   - Verify task count matches
   - Check for data loading errors

3. **Check Implementation**
   - Compare formula translation
   - Verify Z3 integration
   - Check answer extraction logic

4. **Run Subset Analysis**
   ```bash
   # Run small subset for detailed comparison
   npm run benchmark -- \
     --benchmark prontoqa \
     --max-tasks 10 \
     --verbose \
     --output-format json \
     --output-file results/debug-prontoqa.json
   ```

## Validation Checklist

- [ ] Python benchmarks run successfully
- [ ] TypeScript benchmarks run successfully
- [ ] Accuracy within ±4% for all benchmarks
- [ ] F1 scores within ±4% for all benchmarks
- [ ] Both backends (SMT2, JSON) tested
- [ ] Sample outputs manually verified
- [ ] Error rates acceptable (< 5%)
- [ ] Results documented and saved

## Reporting Results

Document validation results in `benchmarks/RESULTS.md`:

```markdown
# Benchmark Validation Results

## Environment
- Python Version: 3.10.12
- TypeScript/Node Version: 22.x
- OpenAI Model: gpt-4o
- Z3 Version: 4.12.5
- Date: 2025-01-XX

## Results Summary

| Benchmark | Python Accuracy | TS Accuracy | Difference |
|-----------|----------------|-------------|------------|
| ProntoQA | 96.5% | 95.8% | -0.7% ✅ |
| FOLIO | 87.2% | 86.1% | -1.1% ✅ |
| ... | ... | ... | ... |

## Analysis

[Add analysis of results, notable differences, and any issues found]
```

## Continuous Validation

Add benchmark validation to CI/CD:

``yaml
# .github/workflows/benchmark.yml
name: Benchmark Validation

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install Z3
        run: sudo apt-get install -y z3
      - name: Run benchmarks
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm run benchmark -- --max-tasks 20
```

## Troubleshooting

### Different Results on Reruns
- Normal with LLMs even at temperature=0
- Run multiple times and average results
- Use seed if available in future API versions

### Timeout Issues
- Increase Z3 timeout: `--z3-timeout 60000`
- Check network latency to OpenAI API
- Monitor system resources

### API Rate Limits
- Use smaller batches: `--max-tasks 10`
- Add delays between requests
- Use enterprise API tier

## Resources

- [Original Paper](https://arxiv.org/abs/xxxx.xxxxx)
- [Python Implementation](https://github.com/DebarghaG/proofofthought)
- [Benchmark Datasets](#)
