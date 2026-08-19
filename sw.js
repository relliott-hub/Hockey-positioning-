/* Service worker: makes the game work with no connection (rink car rides,
   dressing rooms, anywhere with bad signal) and load instantly on repeat visits.

   Strategy is stale-while-revalidate: serve from cache straight away, then
   refresh the cache in the background so the next launch has the newest build.
   Bump CACHE_VERSION whenever the shell changes. */
const CACHE_VERSION = "hiq-v3";

// Relative so the app works from a project subpath (GitHub Pages) or a domain root.
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/data.js",
  "./js/audio.js",
  "./js/sim.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      // Individual misses must not fail the whole install.
      .then(cache => Promise.allSettled(SHELL.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => null);

      // Offline navigation with nothing cached for this exact URL still gets the app.
      if (cached) return cached;
      return fresh.then(res => res || caches.match("./index.html"));
    })
  );
});
