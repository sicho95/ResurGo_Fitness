const CACHE = "resurgo-fitness-static-1.3.4-web.40";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg", "./version.json", "./assets/bodymaps/male.svg", "./assets/bodymaps/female.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL("./#today", self.location.href).href;
  event.waitUntil(clients.matchAll({ type:"window", includeUncontrolled:true }).then(list => {
    const opened = list.find(client => client.url.startsWith(self.location.origin));
    if (opened) {
      opened.postMessage({ type:"OPEN_VIEW", view:"today" });
      return opened.focus();
    }
    return clients.openWindow(target);
  }));
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || "Séance du jour";
  const options = {
    body: data.body || "Ouvre ResurGo Fitness pour voir la séance conseillée.",
    tag: data.tag || "resurgo-session",
    icon: "./icon.svg",
    badge: "./icon.svg",
    data: data.data || { view:"today" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
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
