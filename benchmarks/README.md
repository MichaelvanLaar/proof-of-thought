# ProofOfThought Benchmark Suite

This directory contains the benchmark suite for evaluating ProofOfThought's reasoning capabilities across multiple datasets.

## Benchmarks

### 1. ProntoQA
Tests logical reasoning with fictional predicates and abstract concepts.

**Example:**
```
Rules: Every jompus is fruity. Every wumpus is a jompus.
Question: Is Wumpus fruity?
Answer: Yes
```

**Focus:** Basic logical inference, transitive reasoning

### 2. FOLIO (First-Order Logic Inference)
Tests first-order logic reasoning with complex premises and conclusions.

**Example:**
```
Premises:
1. All students are people.
2. All people who study are smart.
3. John is a student who studies.

Conclusion: John is smart.
Answer: Yes (follows logically)
```

**Focus:** First-order logic, quantifiers, logical validity

### 3. ProofWriter
Tests multi-step proof generation and verification with varying depth.

**Example:**
```
Facts: Charlie is cold.
Rules: If something is cold then it is green.
Question: Is Charlie green?
Answer: Yes
```

**Focus:** Multi-step reasoning, proof traces, reasoning depth

### 4. ConditionalQA
Tests conditional reasoning under different scenarios and conditions.

**Example:**
```
Scenario: Mary decides whether to go to a party based on weather.
Conditions:
- If it rains, Mary will not go to the party.
- It is not raining.

Question: Will Mary go to the party?
Answer: Yes
```

**Focus:** Conditional logic, scenario-based reasoning

### 5. StrategyQA
Tests multi-hop reasoning and implicit knowledge application.

**Example:**
```
Question: Could a dolphin live in the Sahara Desert?
Facts:
- Dolphins are aquatic mammals
- Dolphins require water to survive
- The Sahara Desert is extremely arid

Answer: No
```

**Focus:** Multi-hop reasoning, world knowledge, implicit reasoning

## Directory Structure

```
benchmarks/
├── README.md              # This file
├── cli.ts                 # Command-line interface
├── index.ts               # Main exports
├── types/                 # TypeScript type definitions
│   └── index.ts           # Benchmark types
├── utils/                 # Utility functions
│   ├── metrics.ts         # Metric calculation
│   └── reporter.ts        # Result reporting
├── runners/               # Benchmark runners
│   ├── base-runner.ts     # Base runner class
│   ├── prontoqa-runner.ts
│   ├── folio-runner.ts
│   ├── proofwriter-runner.ts
│   ├── conditionalqa-runner.ts
│   └── strategyqa-runner.ts
├── data/                  # Benchmark datasets (to be populated)
│   ├── prontoqa.json
│   ├── folio.json
│   ├── proofwriter.json
│   ├── conditionalqa.json
│   └── strategyqa.json
└── results/               # Benchmark results (generated)
    ├── prontoqa-smt2.json
    ├── prontoqa-json.json
    └── ...
```

## Usage

### Command Line

Run all benchmarks:
```bash
npm run benchmark
```

Run specific benchmark:
```bash
npm run benchmark -- --benchmark prontoqa --backend smt2
```

Run with limited tasks (for testing):
```bash
npm run benchmark -- --benchmark all --max-tasks 10
```

### Options

```
-b, --benchmark <name>     Benchmark to run (prontoqa, folio, proofwriter,
                           conditionalqa, strategyqa, or all) [default: all]
--backend <type>           Backend to use (smt2 or json) [default: smt2]
--model <name>             OpenAI model to use [default: gpt-4o]
--temperature <number>     Temperature for LLM [default: 0.0]
--max-tokens <number>      Max tokens for LLM [default: 4096]
--z3-timeout <ms>          Z3 solver timeout [default: 30000]
--max-tasks <number>       Limit number of tasks to run
--shuffle                  Shuffle tasks before running
--verbose                  Verbose output during execution
--output-format <format>   Output format (console, json, markdown, csv)
                           [default: console]
--output-file <path>       Save results to file
--api-key <key>            OpenAI API key (or set OPENAI_API_KEY env var)
```

### Examples

**Run ProntoQA with SMT2 backend:**
```bash
npm run benchmark -- --benchmark prontoqa --backend smt2 --verbose
```

**Run all benchmarks with JSON backend, save results:**
```bash
npm run benchmark -- \
  --benchmark all \
  --backend json \
  --output-format json \
  --output-file results/{benchmark}-json.json
```

**Quick test with limited tasks:**
```bash
npm run benchmark -- \
  --benchmark folio \
  --max-tasks 5 \
  --verbose
```

### Programmatic Usage

```typescript
import OpenAI from 'openai';
import { ProntoQARunner } from './benchmarks/runners/prontoqa-runner.js';
import { ConsoleReporter } from './benchmarks/utils/reporter.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const runner = new ProntoQARunner(client);
const reporter = new ConsoleReporter();

const config = {
  benchmarkName: 'ProntoQA',
  backend: 'smt2' as const,
  maxTasks: 10,
  verbose: true,
};

const metrics = await runner.run(config);
const results = []; // Track results during run
console.log(reporter.generateReport(metrics, results));
```

## Metrics

Each benchmark run produces the following metrics:

- **Accuracy**: Percentage of correct predictions
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)
- **F1 Score**: Harmonic mean of precision and recall
- **Average Execution Time**: Mean time per task (ms)
- **Total Execution Time**: Total benchmark duration (ms)
- **Success Rate**: Percentage of tasks completed without errors

## Output Formats

### Console (default)
Human-readable summary with statistics and error breakdown.

### JSON
Machine-readable format with complete metrics and results:
```json
{
  "metrics": {
    "benchmarkName": "ProntoQA",
    "totalTasks": 100,
    "accuracy": 0.95,
    ...
  },
  "results": [...]
}
```

### Markdown
Formatted report suitable for documentation:
```markdown
# ProntoQA Benchmark Results

## Summary

| Metric | Value |
|--------|-------|
| Accuracy | 95.00% |
...
```

### CSV
Tabular format for analysis:
```csv
task_id,question,expected,predicted,correct,execution_time_ms,error
prontoqa_001,"Is Wumpus fruity?",true,true,1,1234,
...
```

## Data Format

Benchmark data files should be JSON arrays of tasks:

```json
[
  {
    "id": "prontoqa_001",
    "question": "Is Wumpus fruity?",
    "facts": [],
    "rules": [
      "Every jompus is fruity.",
      "Every wumpus is a jompus."
    ],
    "answer": true
  }
]
```

Each benchmark has a specific task format (see `types/index.ts`).

## Adding Benchmark Data

To use actual benchmark datasets:

1. Obtain datasets from the original sources
2. Convert to the appropriate JSON format
3. Place in `benchmarks/data/` directory
4. Run benchmarks as normal

The runners will use sample data as fallback if data files are not found.

## Comparing Results

Compare results against Python implementation:

```bash
# Run TypeScript version
npm run benchmark -- --benchmark prontoqa --output-format json --output-file results/ts-prontoqa.json

# Compare with Python results
node scripts/compare-benchmarks.js results/ts-prontoqa.json results/py-prontoqa.json
```

## Performance Notes

- **SMT2 Backend**: Generally slower but more precise for logical reasoning
- **JSON Backend**: Faster for complex nested structures
- **Timeout**: Adjust `--z3-timeout` if tasks are timing out
- **Rate Limits**: Be mindful of OpenAI API rate limits for large benchmarks

## Troubleshooting

### Z3 Not Available
Ensure Z3 is installed:
```bash
# macOS
brew install z3

# Ubuntu/Debian
sudo apt-get install z3

# Or use z3-solver npm package (included as dependency)
```

### API Rate Limits
If hitting OpenAI rate limits:
- Use `--max-tasks` to run smaller batches
- Add delays between requests
- Use a higher tier API key

### Memory Issues
For large benchmarks:
- Process in batches using `--max-tasks`
- Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`

## References

- [Original Python Implementation](https://github.com/DebarghaG/proofofthought)
- [Proof of Thought Paper](https://arxiv.org/abs/xxxx.xxxxx)
- ProntoQA: [Source](...)
- FOLIO: [Source](...)
- ProofWriter: [Source](...)
- ConditionalQA: [Source](...)
- StrategyQA: [Source](...)
