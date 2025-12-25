# Browser Example Troubleshooting Guide

This guide helps resolve common issues with the browser example, particularly around SharedArrayBuffer and Z3 WASM initialization.

## Issue: SharedArrayBuffer Not Available

### Symptoms
- Error: "SharedArrayBuffer is not available"
- Browser console shows `crossOriginIsolated: false`
- Service worker appears active but SharedArrayBuffer is still undefined

### Root Cause
Z3 WASM requires SharedArrayBuffer, which is only available in cross-origin isolated contexts. This requires specific HTTP headers (COOP/COEP) to be set on the page.

### Solution 1: Verify Service Worker (Recommended)

1. **Open DevTools** (F12)
2. **Go to Application tab** > Service Workers
3. **Verify** the service worker is "activated and running"
4. **Check the scope** matches your page URL
5. **Try these steps:**
   ```
   a. Unregister all service workers
   b. Clear site data (Application > Storage > Clear site data)
   c. Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
   d. Wait for automatic reload after service worker registration
   ```

### Solution 2: Use Alternative Service Worker

If the default service worker doesn't work, try the `require-corp` version:

```html
<!-- Replace sw.js with sw-require-corp.js -->
<script>
  navigator.serviceWorker.register('./sw-require-corp.js')
</script>
```

**Note:** This is more strict and may block some CDN resources. Make sure all external resources have proper CORS headers.

### Solution 3: Server-Side Headers (Best for Production)

Instead of using a service worker, configure your web server to send the headers:

#### Apache (.htaccess)
```apache
<IfModule mod_headers.c>
    Header set Cross-Origin-Embedder-Policy "credentialless"
    Header set Cross-Origin-Opener-Policy "same-origin"
</IfModule>
```

#### Nginx
```nginx
add_header Cross-Origin-Embedder-Policy "credentialless";
add_header Cross-Origin-Opener-Policy "same-origin";
```

#### Node.js (Express)
```javascript
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});
```

#### Python (http.server)
```python
from http.server import SimpleHTTPRequestHandler
import http.server

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
    http.server.test(HandlerClass=CORSRequestHandler, port=8000)
```

### Solution 4: Use a Different Browser

Some browsers have better support for cross-origin isolation:

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome  | 92+            | ✅ Full support |
| Edge    | 92+            | ✅ Full support |
| Firefox | 89+            | ✅ Full support (may need `about:config` tweaks) |
| Safari  | 15.2+          | ⚠️ Limited support, use latest version |

### Verification

After applying a fix, verify SharedArrayBuffer is available:

```javascript
console.log('SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');
console.log('Cross-origin isolated:', self.crossOriginIsolated);
```

Both should return `true` for Z3 WASM to work.

## Issue: "exports is not defined"

### Symptoms
- Error when loading z3-solver
- Console shows: `Uncaught ReferenceError: exports is not defined`

### Solution
Make sure you're loading z3-built.js as a script tag, NOT via importmap:

```html
<!-- CORRECT ✅ -->
<script src="https://cdn.jsdelivr.net/npm/z3-solver@4.15.4/build/z3-built.js"></script>

<!-- WRONG ❌ -->
<script type="importmap">
  {
    "imports": {
      "z3-solver": "https://cdn.jsdelivr.net/npm/z3-solver@4.15.4/build/browser.js"
    }
  }
</script>
```

## Issue: "initZ3 was not imported correctly"

### Symptoms
- Error during Z3 initialization
- z3-built.js loaded but init fails
- Error message: "initZ3 was not imported correctly"

### Root Cause
The z3-solver browser module expects `global.initZ3` to be defined, but browsers don't have a `global` object (that's a Node.js thing). When z3-built.js loads via `<script>` tag, it creates `var initZ3` which becomes `window.initZ3`, but z3-solver looks for `global.initZ3`.

### Solution
Add a global shim **before** loading z3-built.js:

```html
<!-- Global shim for z3-solver browser compatibility -->
<script>
  if (typeof global === 'undefined') {
    window.global = globalThis;
  }
</script>

<!-- Load Z3 WASM build -->
<script src="https://cdn.jsdelivr.net/npm/z3-solver@4.15.4/build/z3-built.js"></script>

<!-- Make initZ3 available on global -->
<script>
  if (typeof initZ3 !== 'undefined') {
    if (typeof global !== 'undefined') global.initZ3 = initZ3;
    if (typeof globalThis !== 'undefined') globalThis.initZ3 = initZ3;
  }
</script>
```

Also ensure:
1. z3-built.js is loaded **before** your application code
2. Check that the script loaded successfully (no 404 errors)
3. Verify the script tag is NOT inside a module
4. Try loading from a different CDN if needed:
   ```html
   <script src="https://unpkg.com/z3-solver@4.15.4/build/z3-built.js"></script>
   ```

## Issue: Service Worker Not Activating

### Symptoms
- Console shows "Service worker registered" but no reload happens
- `navigator.serviceWorker.controller` is null

### Solution

1. **Clear everything and start fresh:**
   ```
   DevTools > Application > Storage > Clear site data
   Close DevTools
   Hard reload (Ctrl+Shift+R)
   ```

2. **Check service worker scope:**
   The service worker must be in the same directory or above the page:
   ```
   ✅ /examples/browser/sw.js      serving /examples/browser/index.html
   ❌ /examples/browser/js/sw.js   serving /examples/browser/index.html
   ```

3. **Verify no errors in service worker:**
   ```
   DevTools > Application > Service Workers > Click service worker name
   Check for errors in the console
   ```

4. **Force update:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(function(registrations) {
     for(let registration of registrations) {
       registration.unregister();
     }
   }).then(() => window.location.reload());
   ```

## Issue: CORS Errors with CDN Resources

### Symptoms
- COEP policy blocks external resources
- Console: "blocked by Cross-Origin-Embedder-Policy"

### Solution

When using `require-corp` COEP policy, external resources need CORS headers:

1. **Use CDNs that support CORS:**
   - ✅ esm.sh (automatic CORS)
   - ✅ unpkg.com (supports CORS)
   - ✅ cdn.jsdelivr.net (supports CORS)

2. **Or use `credentialless` instead:**
   ```javascript
   // In sw.js
   newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
   ```

3. **Or self-host all resources**

## Issue: Page Keeps Reloading Infinitely

### Symptoms
- Page reloads continuously
- Never reaches the application

### Solution

The example has a safety limit (2 reloads). If you see this:

1. **Clear session storage:**
   ```javascript
   sessionStorage.clear();
   ```

2. **Unregister service workers:**
   ```
   DevTools > Application > Service Workers > Unregister
   ```

3. **Hard reload**

## Still Having Issues?

### Debug Checklist

Run this in the browser console:

```javascript
// Comprehensive diagnostic
console.log('=== Environment Check ===');
console.log('URL:', location.href);
console.log('Protocol:', location.protocol, '(must be http: or https:)');
console.log('Browser:', navigator.userAgent);
console.log('');
console.log('=== Feature Support ===');
console.log('SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');
console.log('ServiceWorker:', 'serviceWorker' in navigator);
console.log('crossOriginIsolated:', self.crossOriginIsolated);
console.log('');
console.log('=== Service Worker Status ===');
console.log('Controller:', navigator.serviceWorker.controller);
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registrations:', regs.length);
  regs.forEach((reg, i) => {
    console.log(`  [${i}] Scope:`, reg.scope);
    console.log(`  [${i}] Active:`, reg.active ? 'yes' : 'no');
  });
});
```

### Report an Issue

If none of these solutions work, please report the issue with:

1. Output from the debug checklist above
2. Browser name and version
3. Operating system
4. Full console error messages
5. Network tab screenshot showing the HTML response headers

Create an issue at: https://github.com/michaelvanlaar/proof-of-thought/issues
