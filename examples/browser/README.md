# Browser Example

This example demonstrates how to use **proof-of-thought** in a browser environment with Z3 WASM.

## Quick Start

1. **Serve the files with a local server:**

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

2. **Open in your browser:**

Navigate to `http://localhost:8000/examples/browser/`

## Integration Steps

To use **proof-of-thought** in your browser application:

### 1. Install the package

```bash
npm install @michaelvanlaar/proof-of-thought
```

### 2. Import the browser bundle

```typescript
import {
  ProofOfThought,
  Z3WASMAdapter,
  DEFAULT_Z3_WASM_URLS,
} from '@michaelvanlaar/proof-of-thought/browser';
```

### 3. Create Z3 WASM adapter

```typescript
// Option 1: Use CDN (jsdelivr)
const z3Adapter = new Z3WASMAdapter({
  wasmUrl: DEFAULT_Z3_WASM_URLS.jsdelivr,
  timeout: 30000,
});

// Option 2: Use unpkg CDN
const z3Adapter = new Z3WASMAdapter({
  wasmUrl: DEFAULT_Z3_WASM_URLS.unpkg,
});

// Option 3: Self-host the WASM file
const z3Adapter = new Z3WASMAdapter({
  wasmUrl: '/path/to/z3-built.wasm',
});
```

### 4. Create OpenAI client

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'your-api-key',
  dangerouslyAllowBrowser: true, // Required for browser usage
});
```

### 5. Initialize ProofOfThought

```typescript
const pot = new ProofOfThought({
  client,
  z3Adapter,
  backend: 'smt2', // or 'json'
  postprocessing: ['self-refine'], // Optional
  verbose: true,
});
```

### 6. Run reasoning

```typescript
const result = await pot.query('Is Socrates mortal?', 'All humans are mortal. Socrates is human.');

console.log('Answer:', result.answer);
console.log('Verified:', result.isVerified);
console.log('Proof:', result.proof);
```

## Current Status

**Note:** The Z3 WASM adapter provides the framework for browser-based theorem proving, but full SMT-LIB 2.0 execution requires a compatible Z3 WASM build with proper API exports.

The current implementation:

- ✅ WASM loading from CDN or local files
- ✅ Initialization and environment detection
- ✅ Timeout and memory configuration
- ✅ Error handling and diagnostics
- ⚠️ Full Z3 solver execution (requires Z3 WASM bindings)

## Z3 WASM Requirements

To enable full functionality, you need a Z3 WASM build that exports:

- SMT-LIB 2.0 parser functions
- Solver API (context creation, assertion, check-sat)
- Memory management for strings
- Model extraction functions

### Building Z3 WASM

You can build Z3 to WASM using Emscripten:

```bash
# Clone Z3
git clone https://github.com/Z3Prover/z3.git
cd z3

# Build with Emscripten
emconfigure ./configure
emmake make
```

The resulting `z3.wasm` file can be used with this library.

## Example Build Tools

### Vite

```typescript
// vite.config.ts
export default {
  optimizeDeps: {
    exclude: ['@michaelvanlaar/proof-of-thought'],
  },
};
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@michaelvanlaar/proof-of-thought': '@michaelvanlaar/proof-of-thought/browser',
    },
  },
};
```

### Rollup

```javascript
// rollup.config.js
export default {
  external: ['openai'],
  output: {
    format: 'es',
  },
};
```

## Security Considerations

**Never expose your OpenAI API key in client-side code in production!**

For production use:

1. **Use a backend proxy:**

```typescript
// Instead of direct OpenAI client
const client = {
  chat: {
    completions: {
      create: async (params) => {
        return fetch('/api/openai-proxy', {
          method: 'POST',
          body: JSON.stringify(params),
        }).then((r) => r.json());
      },
    },
  },
};
```

2. **Implement rate limiting** on your backend
3. **Validate and sanitize inputs** before processing
4. **Use environment-specific API keys** with appropriate limits

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires WebAssembly support

## Troubleshooting

### CORS Issues with WASM Files

If loading WASM from CDN fails due to CORS:

1. Self-host the WASM file
2. Configure proper CORS headers on your server:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

### Memory Issues

If you encounter out-of-memory errors:

```typescript
const z3Adapter = new Z3WASMAdapter({
  wasmUrl: '...',
  memory: {
    initial: 512, // Increase initial memory (pages)
    maximum: 1024, // Increase maximum memory (pages)
  },
});
```

### Timeout Errors

Adjust the timeout for complex queries:

```typescript
const z3Adapter = new Z3WASMAdapter({
  wasmUrl: '...',
  timeout: 60000, // 60 seconds
});
```

## Next Steps

- Check the [main README](../../README.md) for full API documentation
- Explore postprocessing methods for improved reasoning
- See [Node.js examples](../node/) for backend usage
- Review [benchmarks](../../benchmarks/) for accuracy validation

## License

MIT - See [LICENSE](../../LICENSE)
