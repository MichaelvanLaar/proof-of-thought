# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using ProofOfThought.

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

**Problem:** `npm install @proof-of-thought/core` fails

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
npm install @proof-of-thought/core --legacy-peer-deps

# Or use --force (last resort)
npm install @proof-of-thought/core --force
```

### TypeScript Definition Errors

**Problem:** Can't find type definitions

**Solution:**
```bash
# Ensure TypeScript is installed
npm install -D typescript@latest

# Reinstall package
npm install @proof-of-thought/core
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
   import type { ReasoningResponse } from '@proof-of-thought/core';
   ```

### Module Resolution Errors

**Error:** `Cannot find module '@proof-of-thought/core'`

**Solutions:**

1. **Check package installation:**
   ```bash
   npm list @proof-of-thought/core
   ```

2. **Use correct import path:**
   ```typescript
   // Node.js
   import { ProofOfThought } from '@proof-of-thought/core';

   // Browser
   import { ProofOfThought } from '@proof-of-thought/core/browser';
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
   import { createMockOpenAIClient } from '@proof-of-thought/core/test-utils';

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
import { SMT2Backend } from '@proof-of-thought/core';

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
   console.log('Package version:', require('@proof-of-thought/core/package.json').version);
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
