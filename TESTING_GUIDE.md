# Testing Guide for proof-of-thought

This guide will walk you through testing the package in both Node.js and browser environments.

## Prerequisites

### 1. OpenAI API Key

You'll need an OpenAI API key to test the reasoning functionality:

```bash
export OPENAI_API_KEY="sk-your-key-here"
```

Add this to your `~/.bashrc` or `~/.zshrc` to make it persistent.

### 2. Verify Build

Make sure the package is built:

```bash
npm run build
```

You should see output confirming all bundles were created successfully.

---

## Part 1: Node.js Testing (5-10 minutes)

### Quick Test: Basic Usage Example

The fastest way to verify everything works:

```bash
npx tsx examples/basic-usage.ts
```

**What to look for:**
- ✅ No errors during initialization
- ✅ Three examples run successfully:
  1. Syllogism (Socrates is mortal)
  2. Mathematical reasoning (x + y > 15)
  3. Logical contradiction (red and blue)
- ✅ Each shows:
  - An answer
  - `Verified: true` (or explanation if unverified)
  - Execution time in milliseconds
  - Proof trace steps

**Example successful output:**
```
============================================================
ProofOfThought - Basic Usage Example
============================================================

📝 Example 1: Syllogism
------------------------------------------------------------

✅ Answer: Yes, Socrates is mortal.
📊 Verified: true
⏱️  Execution time: 3245 ms
🔧 Backend: smt2

📋 Proof trace:
  1. Translation
  2. Verification
  3. Explanation
```

### More Examples to Try

1. **SMT2 Backend** (formal logic):
   ```bash
   npx tsx examples/backends/smt2-example.ts
   ```

2. **JSON Backend** (structured reasoning):
   ```bash
   npx tsx examples/backends/json-example.ts
   ```

3. **Self-Refine Postprocessing** (iterative improvement):
   ```bash
   npx tsx examples/postprocessing/self-refine-example.ts
   ```

### What Could Go Wrong?

| Issue | Solution |
|-------|----------|
| `OPENAI_API_KEY not set` | Export your API key (see Prerequisites) |
| `Z3 not found` | Normal! Package uses WASM fallback automatically |
| `Module not found` | Run `npm install` and `npm run build` |
| `API rate limit` | Wait a minute and try again |

---

## Part 2: Browser Testing (10-15 minutes)

### Option A: Simple HTTP Server (Recommended)

1. **Start a local HTTP server:**
   ```bash
   # Using Python (usually pre-installed)
   python3 -m http.server 8000

   # OR using Node.js
   npx http-server -p 8000

   # OR using PHP
   php -S localhost:8000
   ```

2. **Open the browser example:**
   - Navigate to: `http://localhost:8000/examples/browser/index.html`

3. **Test the interface:**
   - Enter your OpenAI API key in the form
   - The default question ("Is Socrates mortal?") is already filled in
   - Click "Run Reasoning"

**What to look for:**
- ✅ Page loads without console errors (check browser DevTools: F12)
- ✅ Form is interactive and styled correctly
- ✅ After clicking "Run Reasoning", you see demo output showing the API structure

**Current limitation:** The browser example shows the API structure in "demo mode" because it requires Z3 WASM integration. This is expected! What matters is:
- No JavaScript errors in the console
- The UI works correctly
- The code structure demonstrates proper browser usage

### Option B: Create a Minimal Working Example

If you want to test actual functionality in the browser:

1. **Create a test HTML file** (`test-browser.html`):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>ProofOfThought Test</title>
   </head>
   <body>
     <h1>Testing ProofOfThought in Browser</h1>
     <div id="output"></div>

     <script type="module">
       import { ProofOfThought } from './dist/browser.js';

       // Test that the module loads
       console.log('✅ ProofOfThought module loaded:', ProofOfThought);

       // Display success message
       document.getElementById('output').innerHTML =
         '<p style="color: green;">✅ Module loaded successfully!</p>' +
         '<p>Check the browser console (F12) for details.</p>';
     </script>
   </body>
   </html>
   ```

2. **Serve it:**
   ```bash
   python3 -m http.server 8000
   ```

3. **Open:** `http://localhost:8000/test-browser.html`

4. **Check the console (F12):**
   - Should see: `✅ ProofOfThought module loaded: [class ProofOfThought]`
   - No errors

### Browser Compatibility Checklist

Test in these browsers if available:

- [ ] **Chrome/Edge** (Chromium-based)
- [ ] **Firefox**
- [ ] **Safari** (if on macOS)

For each browser:
1. Open DevTools (F12)
2. Check for console errors
3. Verify the page loads correctly
4. Confirm no module loading issues

---

## Part 3: Package Structure Verification

### Check Built Files

Verify all output files exist:

```bash
ls -lh dist/
```

**Expected files:**
```
dist/
├── index.js           # ESM entry point
├── index.cjs          # CommonJS entry point
├── index.d.ts         # TypeScript types
├── browser.js         # Browser bundle (dev)
├── browser.min.js     # Browser bundle (prod, ~105KB)
├── backends/          # Individual backend modules
└── (other module files)
```

### Test Package Import

Create a quick test file (`test-import.js`):

```javascript
// Test ESM import
import { ProofOfThought } from './dist/index.js';
console.log('✅ ESM import works:', typeof ProofOfThought);

// Test CommonJS import
const { ProofOfThought: PotCJS } = require('./dist/index.cjs');
console.log('✅ CJS import works:', typeof PotCJS);
```

Run it:
```bash
node test-import.js
```

Should see:
```
✅ ESM import works: function
✅ CJS import works: function
```

---

## Success Criteria Checklist

### Node.js Environment
- [ ] `npm run build` completes without errors
- [ ] `npm test` shows 228 passing tests
- [ ] Basic usage example runs successfully
- [ ] Can create ProofOfThought instance
- [ ] Can execute queries (with OpenAI API key)
- [ ] Proof trace is generated
- [ ] No TypeScript compilation errors

### Browser Environment
- [ ] Browser bundle loads without errors
- [ ] No console errors when importing the module
- [ ] HTML example page displays correctly
- [ ] Module can be imported via `<script type="module">`
- [ ] Works in Chrome/Firefox/Safari

### Package Quality
- [ ] All builds present in `dist/`
- [ ] Browser bundle size is reasonable (~105KB minified)
- [ ] TypeScript types are available (`.d.ts` files)
- [ ] Both ESM and CJS formats work
- [ ] No security vulnerabilities (`npm audit` shows 0)

---

## Quick Start: 2-Minute Smoke Test

If you just want to verify everything works quickly:

```bash
# 1. Build (should take ~5 seconds)
npm run build

# 2. Test (should take ~5 seconds)
npm test

# 3. Run basic example (requires API key, takes ~30 seconds)
export OPENAI_API_KEY="your-key-here"
npx tsx examples/basic-usage.ts

# 4. Check browser bundle loads
python3 -m http.server 8000 &
# Open http://localhost:8000/test-browser.html in your browser
```

If all four steps succeed, the package is ready! 🎉

---

## Troubleshooting

### "Cannot find module" errors
- Run: `npm install && npm run build`
- Make sure you're in the project root directory

### API requests fail
- Verify your API key: `echo $OPENAI_API_KEY`
- Check OpenAI account has credits
- Try with a simpler question first

### Browser CORS errors
- Don't open `file://` URLs directly
- Use a local server (Python, Node.js, etc.)

### Z3 warnings
- These are normal! Package falls back to WASM automatically
- For native Z3, install from: https://github.com/Z3Prover/z3

### Tests fail
- Check Node.js version: `node --version` (need 18+)
- Clear node_modules: `rm -rf node_modules && npm install`

---

## Next Steps After Testing

Once testing is successful:

1. ✅ **Mark browser testing tasks complete** in OpenSpec
2. ✅ **Document any issues found** (create GitHub issues)
3. ✅ **Ready for npm publish** if all tests pass
4. ✅ **Prepare announcement** for community sharing

Good luck with your testing! 🚀
