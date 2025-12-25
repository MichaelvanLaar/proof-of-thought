# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using the **proof-of-thought** TypeScript library.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Z3 Solver Issues](#z3-solver-issues)
- [OpenAI API Issues](#openai-api-issues)
- [Configuration Errors](#configuration-errors)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Browser-Specific Issues](#browser-specific-issues)
- [TypeScript Issues](#typescript-issues)
- [Testing Issues](#testing-issues)
- [Common Error Messages](#common-error-messages)
- [Debugging Techniques](#debugging-techniques)
- [Getting Help](#getting-help)

## Installation Issues

### Package Installation Fails

**Problem:** `npm install @michaelvanlaar/proof-of-thought` fails

**Solutions:**

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   npm install
   ```

3. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Use specific npm version:**
   ```bash
   npm install -g npm@latest
   npm install
   ```

### Peer Dependency Conflicts

**Problem:** "Peer dependency conflict" errors

**Solution:**
```bash
# Use --legacy-peer-deps flag
npm install @michaelvanlaar/proof-of-thought --legacy-peer-deps

# Or use --force (last resort)
npm install @michaelvanlaar/proof-of-thought --force
```

### TypeScript Definition Errors

**Problem:** Can't find type definitions

**Solution:**
```bash
# Ensure TypeScript is installed
npm install -D typescript@latest

# Reinstall package
npm install @michaelvanlaar/proof-of-thought
```

## Z3 Solver Issues

### Z3 Not Found

**Error:** `Z3NotAvailableError: Z3 solver is not available`

**Diagnosis:**
```bash
# Check if Z3 is installed
z3 --version

# Check if z3-solver package is installed
npm list z3-solver
```

**Solutions:**

1. **Install z3-solver package:**
   ```bash
   npm install z3-solver
   ```

2. **Install Z3 system-wide:**
   ```bash
   # macOS
   brew install z3

   # Ubuntu/Debian
   sudo apt-get install z3

   # Windows (download from https://github.com/Z3Prover/z3/releases)
   ```

3. **Specify Z3 path:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     z3Path: '/path/to/z3',
   });
   ```

### Z3 Timeout Errors

**Error:** `Z3TimeoutError: Z3 solver operation timed out`

**Solutions:**

1. **Increase timeout:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     z3Timeout: 60000,  // 60 seconds
   });
   ```

2. **Simplify formula:**
   - Reduce problem complexity
   - Use JSON DSL instead of SMT2
   - Break into smaller sub-problems

3. **Check system resources:**
   ```bash
   # Monitor CPU and memory
   top

   # Check if Z3 is running
   ps aux | grep z3
   ```

### Z3 Parse Errors

**Error:** `ParsingError: Failed to parse Z3 output`

**Solutions:**

1. **Enable verbose logging:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     verbose: true,
   });
   ```

2. **Check Z3 version:**
   ```bash
   z3 --version  # Should be 4.x
   ```

3. **Validate formula manually:**
   ```bash
   # Save formula to file
   echo "(declare-const x Int) (check-sat)" > test.smt2

   # Run Z3 directly
   z3 test.smt2
   ```

### Z3 WASM Adapter Issues

#### WASM Adapter Not Available

**Error:** `No Z3 adapter available. Install Z3 natively or ensure z3-solver package is installed.`

**Diagnosis:**
```bash
# Check if z3-solver is installed
npm list z3-solver

# Should show: z3-solver@x.x.x
```

**Solutions:**

1. **Install z3-solver package:**
   ```bash
   npm install z3-solver
   ```

2. **Clear module cache:**
   ```bash
   rm -rf node_modules/.cache
   npm install
   ```

3. **Check import path:**
   ```typescript
   // Correct import
   import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';

   // Verify z3-solver can be imported
   import init from 'z3-solver';
   ```

#### SMT2 Parse Errors (WASM)

**Error:** `SMT2ParseError: Unexpected token at position X` or `SMT2ParseError: Unmatched parenthesis`

**Diagnosis:**
- WASM adapter uses custom SMT2 parser
- Parser may encounter malformed SMT2 from LLM

**Solutions:**

1. **Enable verbose logging to see formula:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     verbose: true,
   });
   ```

2. **Validate formula structure:**
   ```typescript
   import { parseSMT2 } from '@michaelvanlaar/proof-of-thought/adapters';

   try {
     const commands = parseSMT2(formula);
     console.log('Parsed commands:', commands);
   } catch (error) {
     console.error('Parse error:', error.message);
   }
   ```

3. **Check for unmatched parentheses:**
   - Count opening `(` and closing `)` parentheses
   - Should be equal in valid SMT2

4. **Use native Z3 if parsing fails:**
   ```typescript
   // Native Z3 has more robust parser
   const pot = new ProofOfThought({
     client,
     z3Path: '/usr/bin/z3',  // Force native adapter
   });
   ```

#### Unsupported SMT2 Constructs

**Error:** `SMT2UnsupportedError: Unsupported construct: quantifier 'forall'`

**Diagnosis:**
- WASM adapter has limited SMT2 support
- Not all SMT-LIB 2.0 features implemented

**Currently Unsupported:**
- Quantifiers (`forall`, `exists`)
- Advanced theories (BitVec, Array)
- Custom functions (define-fun)
- Some arithmetic operations

**Solutions:**

1. **Use native Z3 for complex formulas:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     preferWasm: false,  // Use native if available
   });
   ```

2. **Simplify the prompt:**
   - Ask LLM to avoid quantifiers
   - Use propositional logic instead
   - Break complex formulas into simpler parts

3. **Switch to JSON backend:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     backend: 'json',  // Simpler DSL, better WASM support
   });
   ```

#### WASM Performance Issues

**Problem:** WASM adapter performance varies by query type

**Measured Behavior (v0.1.0 Benchmarks):**
- **Average overhead**: 1.52x (WASM ~52% slower than native)
- **Best cases**: WASM can be **faster** than native (0.2x-0.9x)
  - Boolean logic: 89ms (WASM) vs 202ms (native) - 2.3x faster!
  - Real arithmetic: 49ms (WASM) vs 267ms (native) - 5.4x faster!
- **Worst case**: Simple arithmetic can be slower (6x overhead)
- **Typical**: Most queries show 0.4x-2x overhead

> See [Performance Benchmarks](../benchmarks/performance/README.md) for detailed results

**Solutions:**

1. **Use native Z3 for performance-critical apps:**
   ```bash
   # Install native Z3
   brew install z3  # macOS
   sudo apt-get install z3  # Linux
   ```

2. **Prefer WASM only when native unavailable:**
   ```typescript
   // Default behavior (native first, WASM fallback)
   const adapter = await createZ3Adapter();
   ```

3. **Optimize formula complexity:**
   - Reduce number of variables
   - Simplify constraints
   - Use caching for repeated queries

4. **Enable formula caching:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     caching: true,  // Cache parsed formulas
   });
   ```

#### "Context is not a constructor" Error (Browser)

**Problem:** Error in browser console: `TypeError: Context is not a constructor`

**Cause:** z3-solver not properly bundled in browser build (fixed in v0.1.0)

**Solution for v0.1.0+:**
This issue is fixed in v0.1.0. Make sure you're using the latest version:

```bash
npm install @michaelvanlaar/proof-of-thought@latest
npm run build  # Rebuild browser bundle
```

**For older versions or custom builds:**

1. **Ensure z3-solver is bundled (not external):**
   ```javascript
   // In your build config (esbuild, webpack, etc.)
   external: [
     'openai',
     // 'z3-solver' should NOT be in external array for browser builds
   ]
   ```

2. **Verify bundle includes z3-solver:**
   ```bash
   # Bundle should be ~500KB (includes z3-solver)
   # If it's ~250KB, z3-solver is missing
   ls -lh dist/browser.js
   ```

3. **Alternative: Load z3-built.js directly:**
   ```html
   <script src="./z3-built.js"></script>
   <script>
     if (typeof initZ3 !== 'undefined') {
       globalThis.initZ3 = initZ3;
     }
   </script>
   ```

#### Browser WASM Loading Issues

**Problem:** WASM fails to load in browser

**Solutions:**

1. **Ensure SharedArrayBuffer is available (required for Z3 WASM):**
   ```javascript
   // Test in browser console:
   console.log(typeof SharedArrayBuffer);  // Should be "function"
   ```

   If undefined, add COOP/COEP headers:
   ```
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: credentialless
   ```

   Use the provided service worker or Python server:
   ```bash
   cd examples/browser
   python3 serve.py  # Includes proper headers
   ```

2. **Check Content-Security-Policy:**
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval';">
   ```

3. **Ensure CORS headers for WASM:**
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET
   ```

4. **Use local WASM instead of CDN (avoids CORS issues):**
   ```bash
   # Download Z3 WASM files locally
   curl -o z3-built.js https://cdn.jsdelivr.net/npm/z3-solver@4.15.4/build/z3-built.js
   curl -o z3-built.wasm https://cdn.jsdelivr.net/npm/z3-solver@4.15.4/build/z3-built.wasm
   ```

   Then load from local path:
   ```html
   <script src="./z3-built.js"></script>
   ```

5. **Check browser console for errors:**
   - Open DevTools → Console
   - Look for WebAssembly compilation errors
   - Check Network tab for failed WASM requests

## OpenAI API Issues

### Authentication Errors

**Error:** `LLMError: OpenAI API error: 401 Unauthorized`

**Solutions:**

1. **Check API key:**
   ```typescript
   console.log('API key length:', process.env.OPENAI_API_KEY?.length);
   // Should be 51 characters (sk-...)
   ```

2. **Verify environment variables:**
   ```bash
   # Check if .env file is loaded
   echo $OPENAI_API_KEY

   # Or use dotenv
   npm install dotenv
   ```

   ```typescript
   import dotenv from 'dotenv';
   dotenv.config();
   ```

3. **Check API key validity:**
   - Go to https://platform.openai.com/api-keys
   - Verify key is active
   - Regenerate if necessary

### Rate Limit Errors

**Error:** `LLMError: OpenAI API error: 429 Too Many Requests`

**Solutions:**

1. **Implement retry logic:**
   ```typescript
   async function queryWithRetry(question: string, context: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await pot.query(question, context);
       } catch (error) {
         if (error instanceof LLMError && error.statusCode === 429) {
           const delay = Math.pow(2, i) * 1000;  // Exponential backoff
           await new Promise(resolve => setTimeout(resolve, delay));
           continue;
         }
         throw error;
       }
     }
     throw new Error('Max retries exceeded');
   }
   ```

2. **Reduce request rate:**
   ```typescript
   // Use sequential batch processing
   const results = await pot.batch(queries, false);

   // Add delays between requests
   for (const query of queries) {
     const result = await pot.query(...query);
     await new Promise(resolve => setTimeout(resolve, 1000));
   }
   ```

3. **Upgrade API tier:**
   - Check usage limits: https://platform.openai.com/account/limits
   - Consider upgrading plan

### Network Errors

**Error:** `LLMError: Network request failed`

**Solutions:**

1. **Check internet connection:**
   ```bash
   ping api.openai.com
   curl https://api.openai.com/v1/models
   ```

2. **Configure proxy (if needed):**
   ```typescript
   import { HttpsProxyAgent } from 'https-proxy-agent';

   const agent = new HttpsProxyAgent(process.env.HTTP_PROXY);

   const client = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
     httpAgent: agent,
   });
   ```

3. **Increase timeout:**
   ```typescript
   const client = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
     timeout: 60000,  // 60 seconds
   });
   ```

## Configuration Errors

### Missing Required Config

**Error:** `ConfigurationError: OpenAI client is required`

**Solution:**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pot = new ProofOfThought({
  client,  // Don't forget this!
});
```

### Invalid Backend Type

**Error:** `ConfigurationError: Unknown backend type`

**Solution:**
```typescript
// Correct values: 'smt2' or 'json'
const pot = new ProofOfThought({
  client,
  backend: 'smt2',  // Not 'SMT2' or 'smt-2'
});
```

### Invalid Postprocessing Method

**Error:** `Unknown postprocessing method`

**Solution:**
```typescript
// Valid methods
const validMethods = [
  'self-refine',
  'self-consistency',
  'decomposed',
  'least-to-most',
];

const pot = new ProofOfThought({
  client,
  postprocessing: ['self-refine'],  // Use exact names
});
```

## Runtime Errors

### Translation Errors

**Error:** `TranslationError: Failed to translate to SMT2`

**Solutions:**

1. **Check question format:**
   ```typescript
   // Question should be clear and logical
   const question = 'Is Socrates mortal?';  // Good
   const question = 'What about Socrates?';  // Too vague
   ```

2. **Provide adequate context:**
   ```typescript
   const context = 'All humans are mortal. Socrates is human.';  // Good
   const context = 'Socrates.';  // Insufficient
   ```

3. **Simplify complex questions:**
   - Break into sub-questions
   - Use decomposed prompting
   - Remove ambiguity

### Verification Errors

**Error:** `BackendError: SMT2 verification failed`

**Solutions:**

1. **Check formula syntax:**
   ```typescript
   // Enable verbose mode to see formula
   const pot = new ProofOfThought({
     client,
     verbose: true,
   });
   ```

2. **Try different backend:**
   ```typescript
   // If SMT2 fails, try JSON
   const pot = new ProofOfThought({
     client,
     backend: 'json',
   });
   ```

3. **Inspect raw output:**
   ```typescript
   try {
     const result = await pot.query(question, context);
   } catch (error) {
     if (error instanceof Z3Error) {
       console.log('Solver output:', error.solverOutput);
     }
   }
   ```

### Postprocessing Errors

**Error:** `PostprocessingError: Self-Refine failed`

**Solutions:**

1. **Reduce iterations:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     postprocessing: ['self-refine'],
     selfRefineConfig: {
       maxIterations: 2,  // Reduce from 3
     },
   });
   ```

2. **Skip failed methods:**
   - Postprocessing errors are logged but don't fail the query
   - Check `result.postprocessingMetrics` for details

3. **Disable problematic methods:**
   ```typescript
   // If self-refine fails consistently
   const pot = new ProofOfThought({
     client,
     postprocessing: [],  // Disable
   });
   ```

## Performance Issues

### Slow Query Execution

**Problem:** Queries taking too long

**Solutions:**

1. **Use faster model:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     model: 'gpt-4o-mini',  // Faster than gpt-4o
   });
   ```

2. **Reduce token limits:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     maxTokens: 2048,  // Reduce from 4096
   });
   ```

3. **Disable postprocessing:**
   ```typescript
   const pot = new ProofOfThought({
     client,
     postprocessing: [],  // Remove overhead
   });
   ```

4. **Profile execution:**
   ```typescript
   const result = await pot.query(question, context);
   console.log('Execution time:', result.executionTime);

   if (result.postprocessingMetrics) {
     console.log('Breakdown:', result.postprocessingMetrics.methodExecutionTimes);
   }
   ```

### High Memory Usage

**Problem:** Memory growing unbounded

**Solutions:**

1. **Process in batches:**
   ```typescript
   const chunkSize = 50;
   for (let i = 0; i < queries.length; i += chunkSize) {
     const chunk = queries.slice(i, i + chunkSize);
     await pot.batch(chunk, false);
   }
   ```

2. **Clear large objects:**
   ```typescript
   const result = await pot.query(question, context);
   const { answer, isVerified } = result;
   // Don't keep full result with large proof array
   ```

3. **Use streaming (if available):**
   - Currently not implemented
   - Future feature

## Browser-Specific Issues

### WASM Loading Fails

**Error:** `Z3NotAvailableError: Failed to initialize Z3 WASM`

**Solutions:**

1. **Check WASM URL:**
   ```typescript
   const adapter = new Z3WASMAdapter({
     wasmUrl: 'https://cdn.jsdelivr.net/npm/z3-solver@4.12.2/build/z3-built.wasm'
   });
   ```

2. **Check CORS headers:**
   - WASM file must be served with correct CORS headers
   - Use CDN or configure your server

3. **Check CSP policy:**
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="script-src 'self' 'wasm-unsafe-eval';">
   ```

### CORS Errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions:**

1. **Use proxy:**
   ```typescript
   const client = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
     dangerouslyAllowBrowser: true,  // Required for browser
   });
   ```

2. **Set up proxy server:**
   - Proxy OpenAI requests through your backend
   - Avoid exposing API key in browser

3. **Use serverless function:**
   - Deploy reasoning to edge function
   - Call from browser via your API

## TypeScript Issues

### Type Errors

**Problem:** TypeScript compilation errors

**Solutions:**

1. **Update TypeScript:**
   ```bash
   npm install -D typescript@latest
   ```

2. **Check tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "node",
       "esModuleInterop": true
     }
   }
   ```

3. **Import types explicitly:**
   ```typescript
   import type { ReasoningResponse } from '@michaelvanlaar/proof-of-thought';
   ```

### Module Resolution Errors

**Error:** `Cannot find module '@michaelvanlaar/proof-of-thought'`

**Solutions:**

1. **Check package installation:**
   ```bash
   npm list @michaelvanlaar/proof-of-thought
   ```

2. **Use correct import path:**
   ```typescript
   // Node.js
   import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';

   // Browser
   import { ProofOfThought } from '@michaelvanlaar/proof-of-thought/browser';
   ```

3. **Check module resolution:**
   ```json
   // package.json
   {
     "type": "module"  // For ESM
   }
   ```

## Testing Issues

### Tests Failing

**Problem:** Tests fail with API errors

**Solutions:**

1. **Use mocks:**
   ```typescript
   import { createMockOpenAIClient } from '@michaelvanlaar/proof-of-thought/test-utils';

   const mockClient = createMockOpenAIClient();
   const pot = new ProofOfThought({ client: mockClient });
   ```

2. **Set environment variables:**
   ```bash
   # .env.test
   OPENAI_API_KEY=sk-test-key
   Z3_PATH=/usr/local/bin/z3
   ```

3. **Skip integration tests:**
   ```typescript
   describe.skip('Integration tests', () => {
     // Skipped in CI
   });
   ```

### Coverage Issues

**Problem:** Low test coverage

**Solutions:**

1. **Run coverage report:**
   ```bash
   npm run test:coverage
   ```

2. **Check uncovered lines:**
   ```bash
   open coverage/index.html
   ```

3. **Add missing tests:**
   - Focus on error paths
   - Test edge cases
   - Mock external dependencies

## Common Error Messages

### "Cannot read property 'answer' of undefined"

**Cause:** Query failed and returned undefined

**Solution:**
```typescript
try {
  const result = await pot.query(question, context);
  if (result) {
    console.log(result.answer);
  }
} catch (error) {
  console.error('Query failed:', error);
}
```

### "Maximum call stack size exceeded"

**Cause:** Infinite recursion in postprocessing

**Solution:**
```typescript
// Reduce iteration limits
const pot = new ProofOfThought({
  client,
  selfRefineConfig: {
    maxIterations: 2,
  },
  decomposedConfig: {
    maxSubQuestions: 3,
  },
});
```

### "Unexpected token" in JSON parsing

**Cause:** Invalid JSON response from LLM

**Solution:**
```typescript
// Try JSON DSL backend
const pot = new ProofOfThought({
  client,
  backend: 'json',
});

// Or enable verbose mode to inspect
const pot = new ProofOfThought({
  client,
  verbose: true,
});
```

## Debugging Techniques

### Enable Verbose Logging

```typescript
const pot = new ProofOfThought({
  client,
  verbose: true,
});

// Logs will show:
// - LLM prompts and responses
// - Z3 formulas and output
// - Timing information
// - Postprocessing steps
```

### Inspect Proof Trace

```typescript
const result = await pot.query(question, context);

console.log('Proof steps:');
result.proof.forEach(step => {
  console.log(`${step.step}. ${step.description}`);
  if (step.formula) console.log('Formula:', step.formula.substring(0, 100));
  if (step.solverOutput) console.log('Z3 output:', step.solverOutput.substring(0, 100));
});
```

### Test Individual Components

```typescript
// Test backend directly
import { SMT2Backend } from '@michaelvanlaar/proof-of-thought';

const backend = new SMT2Backend({ client, z3Adapter });

const formula = await backend.translate(question, context);
console.log('Formula:', formula);

const result = await backend.verify(formula);
console.log('Result:', result);
```

### Use Debugger

```typescript
// Set breakpoints in your code
debugger;

// Or use Node.js inspector
// node --inspect-brk your-script.js
```

### Check Environment

```typescript
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')));

// Check Z3
const { execSync } = require('child_process');
try {
  const z3Version = execSync('z3 --version').toString();
  console.log('Z3 version:', z3Version);
} catch (error) {
  console.log('Z3 not found');
}
```

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Read the [API documentation](./API.md)
3. Review [examples](../examples/)
4. Search [existing issues](https://github.com/MichaelvanLaar/proof-of-thought/issues)

### Reporting Issues

When reporting issues, include:

1. **Error message:** Full error and stack trace
2. **Code:** Minimal reproducible example
3. **Environment:**
   ```typescript
   console.log('Node:', process.version);
   console.log('OS:', process.platform);
   console.log('Package version:', require('@michaelvanlaar/proof-of-thought/package.json').version);
   ```
4. **Configuration:** Sanitized config (remove API keys!)
5. **Steps to reproduce:** Clear instructions

### Issue Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Initialize with config...
2. Call query with...
3. See error...

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Code example**
\```typescript
// Minimal reproducible example
\```

**Environment**
- Node.js version:
- OS:
- Package version:
- TypeScript version:

**Additional context**
Any other relevant information.
```

### Community Support

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and general discussion
- **Stack Overflow:** Use tag `proofofthought`

### Documentation

- [README](../README.md)
- [API Reference](./API.md)
- [Architecture](./ARCHITECTURE.md)
- [Performance](./PERFORMANCE.md)
- [Migration Guide](./MIGRATION.md)

## Summary

Most issues fall into these categories:

1. **Configuration:** Missing or incorrect config
2. **Environment:** Z3 not found, wrong Node version
3. **API:** Authentication, rate limits, network
4. **Usage:** Incorrect method calls, missing await
5. **Performance:** Slow queries, high memory

**Quick Checklist:**
- [ ] Node.js 18+ installed
- [ ] Z3 solver available
- [ ] OpenAI API key configured
- [ ] Package installed correctly
- [ ] Using correct import paths
- [ ] Awaiting async calls
- [ ] Error handling in place
- [ ] Verbose mode enabled for debugging

If you're still stuck, please [open an issue](https://github.com/MichaelvanLaar/proof-of-thought/issues/new) with details!
