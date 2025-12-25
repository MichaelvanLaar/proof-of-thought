/**
 * Alternative Service Worker using require-corp instead of credentialless
 * Use this if you're having issues with SharedArrayBuffer availability
 *
 * Note: require-corp is more strict and may block some CDN resources
 * that don't have proper CORS headers.
 */

self.addEventListener('install', function (event) {
  console.log('[SW-RC] Installing service worker (require-corp mode)...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW-RC] Activating service worker (require-corp mode)...');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW-RC] Service worker activated and claimed clients');
    })
  );
});

self.addEventListener('fetch', function (event) {
  // Skip requests that are only-if-cached and not same-origin
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // Apply COOP/COEP headers to same-origin requests
        if (isSameOrigin) {
          const newHeaders = new Headers(response.headers);

          // Use require-corp for maximum compatibility
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

          // Set CORP header for all same-origin resources
          if (!newHeaders.has('Cross-Origin-Resource-Policy')) {
            newHeaders.set('Cross-Origin-Resource-Policy', 'same-origin');
          }

          const moddedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });

          const requestType = event.request.mode === 'navigate' ? 'navigation' : event.request.destination || 'other';
          console.log(`[SW-RC] Applied COOP/COEP (require-corp) to ${requestType}:`, event.request.url);

          return moddedResponse;
        }

        // For cross-origin requests, return as-is
        return response;
      })
      .catch(function (e) {
        console.error('[SW-RC] Fetch error:', e);
        return new Response('Service Worker fetch failed', {
          status: 500,
          statusText: 'Service Worker Error',
        });
      })
  );
});
