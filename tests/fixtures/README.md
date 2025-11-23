# Test Fixtures

This directory contains test fixtures derived from the original Python implementation of ProofOfThought.

## Directory Structure

```
fixtures/
├── README.md              # This file
├── reasoning/             # Reasoning test cases
│   ├── simple.json        # Simple reasoning examples
│   ├── logical.json       # Logical inference cases
│   └── mathematical.json  # Mathematical reasoning
├── benchmarks/            # Benchmark datasets (samples)
│   ├── prontoqa/          # ProntoQA samples
│   ├── folio/             # FOLIO samples
│   ├── proofwriter/       # ProofWriter samples
│   ├── conditionalqa/     # ConditionalQA samples
│   └── strategyqa/        # StrategyQA samples
└── expected/              # Expected outputs
    ├── smt2/              # Expected SMT2 outputs
    └── json/              # Expected JSON DSL outputs
```

## Source

Test fixtures are derived from:
- Original repository: https://github.com/DebarghaG/proofofthought
- Benchmark datasets: ProntoQA, FOLIO, ProofWriter, ConditionalQA, StrategyQA
- Python test suite: tests/ directory

## Usage

Import fixtures in tests:

```typescript
import { reasoningFixtures } from '@tests/helpers';
import simpleTests from '@tests/fixtures/reasoning/simple.json';
```

## Updating Fixtures

To update fixtures from the Python implementation:

1. Clone the original repository
2. Run `python run_tests.py` to generate outputs
3. Extract relevant test cases
4. Convert to TypeScript-compatible JSON format
5. Update fixtures in this directory

## Notes

- Fixtures are kept minimal to avoid bloating the repository
- Full benchmark datasets should be downloaded separately if needed
- Fixtures serve as regression tests to ensure TypeScript port matches Python behavior
