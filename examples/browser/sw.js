/**
 * Service Worker for enabling COOP/COEP headers
 * Required for SharedArrayBuffer support in z3-solver
 *
 * Based on: https://dev.to/stefnotch/enabling-coop-coep-without-touching-the-server-2d3n
 */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  // Skip requests that are only-if-cached and not same-origin
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // Check if this is a navigation request (HTML page)
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          // For navigation requests, add COOP/COEP headers
          const newHeaders = new Headers(response.headers);

          // Use credentialless instead of require-corp for better CDN compatibility
          newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

          const moddedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });

          console.log('[SW] Applied COOP/COEP headers to navigation request:', event.request.url);
          return moddedResponse;
        }

        // For other requests, return as-is
        return response;
      })
      .catch(function (e) {
        console.error('[SW] Fetch error:', e);
        // Return a basic error response
        return new Response('Service Worker fetch failed', {
          status: 500,
          statusText: 'Service Worker Error'
        });
      })
  );
});
