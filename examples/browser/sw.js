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
        // Clone the response and add COOP/COEP headers
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

        const moddedResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });

        return moddedResponse;
      })
      .catch(function (e) {
        console.error('Service worker fetch error:', e);
      })
  );
});
