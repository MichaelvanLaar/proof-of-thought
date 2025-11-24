# Performance Characteristics

This document describes the performance characteristics, bottlenecks, and optimization strategies for ProofOfThought.

## Table of Contents

- [Performance Overview](#performance-overview)
- [Execution Time Breakdown](#execution-time-breakdown)
- [Bottlenecks](#bottlenecks)
- [Benchmark Results](#benchmark-results)
- [Optimization Strategies](#optimization-strategies)
- [Batch Processing](#batch-processing)
- [Caching Opportunities](#caching-opportunities)
- [Memory Usage](#memory-usage)
- [Network Considerations](#network-considerations)
- [Z3 Performance](#z3-performance)
- [Postprocessing Impact](#postprocessing-impact)
- [Browser vs Node.js](#browser-vs-nodejs)
- [Profiling and Monitoring](#profiling-and-monitoring)

## Performance Overview

### Typical Query Times

| Configuration               | Average Time | Range        |
|-----------------------------|--------------|--------------|
| Basic (SMT2, no postproc)   | 3-5 seconds  | 2-10s        |
| Basic (JSON, no postproc)   | 3-6 seconds  | 2-12s        |
| With Self-Refine (3 iter)   | 10-15 seconds| 8-25s        |
| With Self-Consistency (5x)  | 15-25 seconds| 12-40s       |
| With Decomposed (3 sub-q)   | 10-20 seconds| 8-30s        |
| With Least-to-Most (3 levels)| 12-22 seconds| 10-35s       |

**Note:** Times vary significantly based on:
- Question complexity
- LLM response time
- Z3 solving complexity
- Network latency
- Temperature settings

### Performance Factors

```
Total Time = LLM Time + Z3 Time + Network Time + Processing Time
```

**Typical Distribution:**
- LLM calls: 70-80% of total time
- Z3 execution: 10-20% of total time
- Network I/O: 5-10% of total time
- Processing: <5% of total time

## Execution Time Breakdown

### Base Query (No Postprocessing)

```
┌────────────────────────────────────────────────┐
│ Total: ~4 seconds                              │
├────────────────────────────────────────────────┤
│ 1. Translation (LLM)            2.0s  (50%)    │
│ 2. Verification (Z3)            0.5s  (12.5%)  │
│ 3. Explanation (LLM)            1.3s  (32.5%)  │
│ 4. Processing overhead          0.2s  (5%)     │
└────────────────────────────────────────────────┘
```

### With Self-Refine (3 iterations)

```
┌────────────────────────────────────────────────┐
│ Total: ~12 seconds                             │
├────────────────────────────────────────────────┤
│ Base reasoning                  4.0s  (33%)    │
│ Iteration 1 (critique + improve) 2.5s  (21%)    │
│ Iteration 2 (critique + improve) 2.5s  (21%)    │
│ Iteration 3 (critique + improve) 2.5s  (21%)    │
│ Processing overhead             0.5s  (4%)     │
└────────────────────────────────────────────────┘
```

### With Self-Consistency (5 samples)

```
┌────────────────────────────────────────────────┐
│ Total: ~20 seconds (parallel)                  │
├────────────────────────────────────────────────┤
│ 5 reasoning paths (parallel)    18.0s (90%)    │
│ Aggregation & voting            1.5s  (7.5%)   │
│ Processing overhead             0.5s  (2.5%)   │
└────────────────────────────────────────────────┘
```

## Bottlenecks

### 1. LLM API Calls

**Impact:** Highest (70-80% of total time)

**Factors:**
- Network latency to OpenAI/Azure API
- Model inference time
- Token count (longer prompts = slower)
- Temperature (higher = more variable time)
- Rate limits

**Mitigation:**
- Use faster models (gpt-4o-mini when appropriate)
- Reduce max_tokens if possible
- Use Azure OpenAI for regional proximity
- Implement request batching

### 2. Z3 Solver Execution

**Impact:** Medium (10-20% of total time)

**Factors:**
- Formula complexity
- Number of quantifiers
- Search space size
- Timeout settings

**Mitigation:**
- Simplify formulas when possible
- Use JSON DSL for simpler problems
- Tune Z3 timeout appropriately
- Use native Z3 instead of CLI

### 3. Network Latency

**Impact:** Medium (5-10% of total time)

**Factors:**
- Geographic distance to API
- Network quality
- Request/response size

**Mitigation:**
- Use regional API endpoints
- Implement connection pooling
- Consider edge deployment

### 4. Postprocessing Overhead

**Impact:** Low to High (depends on method)

**Factors:**
- Number of iterations/samples
- Complexity of aggregation
- Additional LLM calls

**Mitigation:**
- Reduce iteration counts
- Use selective postprocessing
- Implement early stopping

## Benchmark Results

### Accuracy vs Performance Trade-offs

| Configuration                  | Accuracy | Avg Time | Cost  |
|--------------------------------|----------|----------|-------|
| Base (SMT2)                    | 86.1%    | 4s       | $0.01 |
| + Self-Refine                  | 89.3%    | 12s      | $0.04 |
| + Self-Consistency (5x)        | 91.7%    | 20s      | $0.05 |
| + Decomposed                   | 88.5%    | 15s      | $0.05 |
| + Least-to-Most                | 89.8%    | 18s      | $0.06 |
| + Multiple methods             | 93.2%    | 35s      | $0.12 |

### Backend Comparison

| Backend | Avg Time | Accuracy | Best For                    |
|---------|----------|----------|-----------------------------|
| SMT2    | 4.0s     | 86.1%    | Complex logic, quantifiers  |
| JSON    | 4.5s     | 85.3%    | Structured problems         |

### Model Comparison

| Model       | Avg Time | Accuracy | Cost/Query |
|-------------|----------|----------|------------|
| gpt-4o      | 3.5s     | 86.1%    | $0.010     |
| gpt-4o-mini | 2.0s     | 82.3%    | $0.002     |
| gpt-4       | 5.0s     | 85.7%    | $0.020     |

## Optimization Strategies

### 1. Model Selection

```typescript
// For simple queries
const pot = new ProofOfThought({
  client,
  model: 'gpt-4o-mini',  // 2x faster, 80% cost reduction
});

// For complex queries
const pot = new ProofOfThought({
  client,
  model: 'gpt-4o',  // Best accuracy/speed balance
});
```

### 2. Token Optimization

```typescript
const pot = new ProofOfThought({
  client,
  maxTokens: 2048,  // Reduce from default 4096 for faster responses
});
```

### 3. Selective Postprocessing

```typescript
// Apply postprocessing only when needed
function shouldUsePostprocessing(question: string): boolean {
  const complexity = assessComplexity(question);
  return complexity > THRESHOLD;
}

const config: ProofOfThoughtConfig = {
  client,
  postprocessing: shouldUsePostprocessing(question)
    ? ['self-refine']
    : [],
};
```

### 4. Temperature Tuning

```typescript
// Lower temperature for faster, more deterministic responses
const pot = new ProofOfThought({
  client,
  temperature: 0.0,  // Fastest, most consistent
});

// Higher temperature for self-consistency (intentional variation)
const pot = new ProofOfThought({
  client,
  postprocessing: ['self-consistency'],
  selfConsistencyConfig: {
    temperature: 0.7,  // Diversity for voting
  },
});
```

### 5. Z3 Timeout Optimization

```typescript
// Shorter timeout for simple queries
const pot = new ProofOfThought({
  client,
  z3Timeout: 5000,  // 5 seconds instead of 30
});

// Longer timeout for complex queries
const pot = new ProofOfThought({
  client,
  z3Timeout: 60000,  // 1 minute for hard problems
});
```

## Batch Processing

### Sequential vs Parallel

**Sequential:**
```typescript
const results = await pot.batch(queries, false);
// Time: N * avg_query_time
// Memory: Low
// Rate limits: No issues
```

**Parallel:**
```typescript
const results = await pot.batch(queries, true);
// Time: Max(query_times) + overhead
// Memory: High (N concurrent requests)
// Rate limits: May hit limits
```

### Performance Comparison

| Queries | Sequential | Parallel | Speedup |
|---------|------------|----------|---------|
| 10      | 40s        | 8s       | 5.0x    |
| 50      | 200s       | 12s      | 16.7x   |
| 100     | 400s       | 15s      | 26.7x   |

**Note:** Parallel processing may hit rate limits. Use with caution.

### Batch Optimization

```typescript
// Process in chunks to balance speed and rate limits
async function batchWithChunks(
  queries: Array<[string, string]>,
  chunkSize: number = 10
): Promise<ReasoningResponse[]> {
  const results: ReasoningResponse[] = [];

  for (let i = 0; i < queries.length; i += chunkSize) {
    const chunk = queries.slice(i, i + chunkSize);
    const chunkResults = await pot.batch(chunk, true);
    results.push(...chunkResults);

    // Optional: delay between chunks
    if (i + chunkSize < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
```

## Caching Opportunities

### LLM Response Caching

```typescript
// Simple in-memory cache
const cache = new Map<string, string>();

function getCacheKey(question: string, context: string): string {
  return `${question}::${context}`;
}

async function queryCached(question: string, context: string) {
  const key = getCacheKey(question, context);

  if (cache.has(key)) {
    return JSON.parse(cache.get(key)!);
  }

  const result = await pot.query(question, context);
  cache.set(key, JSON.stringify(result));

  return result;
}
```

**Potential Savings:**
- Cache hit: 0.1s (>95% faster)
- Cache miss: Normal query time

### Formula Caching

```typescript
// Cache translated formulas
const formulaCache = new Map<string, Formula>();

// Cache Z3 results
const z3Cache = new Map<string, VerificationResult>();
```

## Memory Usage

### Typical Memory Footprint

| Component                | Memory Usage  |
|--------------------------|---------------|
| ProofOfThought instance  | ~1 MB         |
| Single query             | ~500 KB       |
| Batch (10 parallel)      | ~5-10 MB      |
| Z3 Native adapter        | ~10-20 MB     |
| Z3 WASM module           | ~8 MB (loaded)|

### Memory Optimization

```typescript
// Clear large responses after processing
async function processQuery(question: string, context: string) {
  const result = await pot.query(question, context);

  // Extract only what you need
  const summary = {
    answer: result.answer,
    isVerified: result.isVerified,
  };

  // Let large proof trace be garbage collected
  return summary;
}
```

### Batch Memory Management

```typescript
// Process large batches in chunks to limit memory
async function processLargeBatch(queries: Array<[string, string]>) {
  const chunkSize = 50;
  const results: ReasoningResponse[] = [];

  for (let i = 0; i < queries.length; i += chunkSize) {
    const chunk = queries.slice(i, i + chunkSize);
    const chunkResults = await pot.batch(chunk, false);  // Sequential

    // Process results immediately
    results.push(...processResults(chunkResults));

    // Explicit garbage collection hint (if available)
    if (global.gc) {
      global.gc();
    }
  }

  return results;
}
```

## Network Considerations

### API Endpoint Selection

```typescript
// Use regional endpoints for lower latency
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',  // Default
});

// Azure OpenAI with regional endpoint
const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `https://your-region.openai.azure.com/openai/deployments/${deployment}`,
  // Choose region closest to your users
});
```

### Connection Pooling

```typescript
// Reuse HTTP connections
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
```

### Timeout Configuration

```typescript
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,  // 30 second timeout
  maxRetries: 2,   // Retry failed requests
});
```

## Z3 Performance

### Native vs CLI

| Execution Mode   | Avg Time | Overhead |
|------------------|----------|----------|
| z3-solver (API)  | 0.3s     | Low      |
| CLI (spawn)      | 0.5s     | Medium   |
| WASM (browser)   | 0.4s     | Low      |

### Formula Complexity

| Formula Type           | Avg Z3 Time |
|------------------------|-------------|
| Simple boolean         | <0.1s       |
| Arithmetic constraints | 0.2-0.5s    |
| With quantifiers       | 0.5-2.0s    |
| Complex nested logic   | 1.0-5.0s    |

### Z3 Optimization

```typescript
// Use simpler formulas when possible
const pot = new ProofOfThought({
  client,
  backend: 'json',  // May generate simpler formulas
});

// Tune timeout based on expected complexity
const pot = new ProofOfThought({
  client,
  z3Timeout: assessComplexity(question) > 0.5 ? 60000 : 10000,
});
```

## Postprocessing Impact

### Method Overhead

| Method           | Additional Time | Accuracy Gain |
|------------------|-----------------|---------------|
| Self-Refine      | +3-5x base time | +3-5%         |
| Self-Consistency | +5-7x base time | +5-7%         |
| Decomposed       | +3-6x base time | +2-4%         |
| Least-to-Most    | +4-7x base time | +3-6%         |

### When to Use Postprocessing

**Use when:**
- Accuracy is critical
- Query is high-value
- Base result is uncertain
- Time is not a constraint

**Skip when:**
- Speed is critical
- Query is simple
- Base result is confident
- Batch processing many queries

## Browser vs Node.js

### Bundle Sizes

| Bundle Type              | Development | Production | Gzipped (est.) |
|-------------------------|-------------|------------|----------------|
| Browser bundle          | 217 KB      | 106 KB     | ~35 KB         |
| Node.js (ESM)           | 95 KB       | N/A        | ~30 KB         |
| Node.js (CJS)           | 100 KB      | N/A        | ~32 KB         |

**Bundle Contents:**

- Core reasoning logic: ~40 KB
- Backend implementations: ~35 KB
- Type definitions: ~5 KB
- Utilities and helpers: ~15 KB
- Dependencies (bundled): ~30 KB

**Note:** Z3 WASM module (~8 MB) is loaded separately and not included in bundle sizes.

### Performance Comparison

| Environment | Avg Query Time | Notes                        |
|-------------|----------------|------------------------------|
| Node.js     | 4.0s           | Best overall performance     |
| Browser     | 4.5s           | Slightly slower (WASM)       |

**Browser Overhead:**
- WASM module load: 0.5-1.0s (one-time)
- WASM execution: +0.1-0.2s per query
- Network from browser: Variable

### Bundle Loading Performance

**Initial Load (Browser):**

```text
┌──────────────────────────────────────────────┐
│ Total: ~1.5s (first visit, no cache)        │
├──────────────────────────────────────────────┤
│ 1. Download bundle (106KB)    0.3s  (20%)   │
│ 2. Parse & evaluate JS        0.2s  (13%)   │
│ 3. Download Z3 WASM (8MB)     0.8s  (53%)   │
│ 4. Initialize Z3              0.2s  (13%)   │
└──────────────────────────────────────────────┘
```

**Subsequent Loads (with cache):**

- Bundle: <0.1s (from cache)
- Z3 WASM: <0.1s (from cache)
- Total: ~0.2s

### Browser Optimization

```typescript
// Preload WASM module
const z3Adapter = new Z3WASMAdapter({
  wasmUrl: 'https://cdn.jsdelivr.net/npm/z3-solver@4.12.2/build/z3-built.wasm'
});

await z3Adapter.initialize();  // Preload before first query

const pot = new ProofOfThought({
  client,
  z3Adapter,
});
```

## Profiling and Monitoring

### Built-in Timing

```typescript
const result = await pot.query(question, context);
console.log(`Execution time: ${result.executionTime}ms`);

if (result.postprocessingMetrics) {
  console.log('Postprocessing breakdown:', result.postprocessingMetrics.methodExecutionTimes);
}
```

### Custom Profiling

```typescript
class ProfilingProofOfThought extends ProofOfThought {
  async query(question: string, context?: string): Promise<ReasoningResponse> {
    const start = performance.now();

    console.time('Total query');
    const result = await super.query(question, context);
    console.timeEnd('Total query');

    const end = performance.now();
    console.log(`Custom timing: ${end - start}ms`);

    return result;
  }
}
```

### Metrics Collection

```typescript
interface QueryMetrics {
  queryId: string;
  question: string;
  executionTime: number;
  llmTime: number;
  z3Time: number;
  postprocessingTime: number;
  tokensUsed?: number;
  isVerified: boolean;
  timestamp: Date;
}

const metrics: QueryMetrics[] = [];

async function queryWithMetrics(question: string, context: string) {
  const startTime = Date.now();

  const result = await pot.query(question, context);

  metrics.push({
    queryId: crypto.randomUUID(),
    question,
    executionTime: result.executionTime,
    llmTime: 0,  // Extract from proof steps
    z3Time: 0,   // Extract from proof steps
    postprocessingTime: result.postprocessingMetrics?.totalPostprocessingTime || 0,
    tokensUsed: result.tokensUsed?.total,
    isVerified: result.isVerified,
    timestamp: new Date(),
  });

  return result;
}

// Analyze metrics
function analyzeMetrics() {
  const avgTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
  const p95Time = calculatePercentile(metrics.map(m => m.executionTime), 0.95);

  console.log(`Average query time: ${avgTime}ms`);
  console.log(`P95 query time: ${p95Time}ms`);
  console.log(`Verification rate: ${metrics.filter(m => m.isVerified).length / metrics.length * 100}%`);
}
```

## Summary

### Key Takeaways

1. **LLM calls dominate execution time** (70-80%)
2. **Postprocessing significantly increases time** but improves accuracy
3. **Parallel batch processing** provides major speedups
4. **Model selection** affects both speed and cost
5. **Caching** can provide >95% speedup for repeated queries
6. **Z3 optimization** has moderate impact (10-20% of time)

### Performance Checklist

- [ ] Choose appropriate model (gpt-4o vs gpt-4o-mini)
- [ ] Set reasonable token limits
- [ ] Use postprocessing selectively
- [ ] Batch queries when possible
- [ ] Implement caching for repeated queries
- [ ] Tune Z3 timeout based on complexity
- [ ] Monitor execution times
- [ ] Profile bottlenecks
- [ ] Consider regional API endpoints
- [ ] Use connection pooling

For more details, see:
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Benchmarks](../benchmarks/README.md)
