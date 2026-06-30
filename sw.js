const CACHE = "resurgo-fitness-static-1.3.0";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg", "./version.json", "./assets/app/part-00.js", "./assets/app/part-01.js", "./assets/app/part-02.js", "./assets/app/part-03.js", "./assets/app/part-04.js", "./assets/app/part-05.js", "./assets/app/part-06.js", "./assets/app/part-07.js", "./assets/app/part-08.js", "./assets/app/part-09.js", "./assets/bodymaps/male.svg", "./assets/bodymaps/female.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const onlineFirst = event.request.mode === "navigate" || ["/", "/index.html", "/app.js", "/styles.css", "/manifest.webmanifest", "/version.json"].some(path => url.pathname.endsWith(path));
  if (onlineFirst) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
