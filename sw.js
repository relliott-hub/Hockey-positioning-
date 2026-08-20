/* Service worker: makes the game work with no connection (rink car rides,
   dressing rooms, anywhere with bad signal) and load instantly on repeat visits.

   Strategy is stale-while-revalidate: serve from cache straight away, then
   refresh the cache in the background so the next launch has the newest build.
   Bump CACHE_VERSION whenever the shell changes. */
const CACHE_VERSION = "hiq-v4";

// Relative so the app works from a project subpath (GitHub Pages) or a domain root.
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/rink.js",
  "./js/plays.js",
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

  /* The page itself and the code are fetched network-first when online.

     Cache-first is why an updated build kept showing the previous version: the
     old copy was served immediately and the new one only appeared on the visit
     after. For a game people are actively testing, seeing yesterday's build is
     worse than waiting a moment for today's. Falling back to cache the instant
     the network fails keeps it fully playable offline. */
  const isCode = /\.(html|js|css|webmanifest)$/.test(url.pathname) ||
                 url.pathname.endsWith("/") ||
                 url.pathname === self.registration.scope;

  if (isCode) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  // Images, icons and fonts don't change between builds — serve them instantly
  // and refresh in the background.
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
      return cached || fresh.then(res => res || caches.match("./index.html"));
    })
  );
});
