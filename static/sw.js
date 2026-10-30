const CACHE = "resurgo-fitness-static-__APP_BUILD__";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg", "./version.json", "./assets/bodymaps/male.svg", "./assets/bodymaps/female.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && !key.startsWith("resurgo-voice-")).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Persist push messages even when ResurGo is closed (iOS Home Screen PWA).
function openPushInbox(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open("ResurGoPushInboxV1",1);
    req.onupgradeneeded=()=>req.result.createObjectStore("inbox",{keyPath:"id"});
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function storePush(item){
  const db=await openPushInbox();
  try{
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("inbox","readwrite");
      tx.objectStore("inbox").put(item);
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
  }finally{db.close();}
}
self.addEventListener("push",event=>{
  event.waitUntil((async()=>{
    let payload={};
    try{payload=event.data?.json()||{};}catch{}
    const id=String(payload.id||"push-"+Date.now()).slice(0,128);
    const item={
      id,title:String(payload.title||"Rappel ResurGo").slice(0,120),
      body:String(payload.body||"Une séance est prévue.").slice(0,250),
      sessionId:String(payload.sessionId||"").slice(0,128),
      profileId:String(payload.profileId||"").slice(0,128),
      receivedAt:new Date().toISOString(),read:false
    };
    try{await storePush(item);}catch(e){console.warn("Push inbox inaccessible",e);}
    const open=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of open)client.postMessage({type:"RESURGO_PUSH",id});
    await self.registration.showNotification(item.title,{
      body:item.body,icon:"./icon.svg",badge:"./icon.svg",
      tag:item.id,data:{notificationId:id}
    });
  })());
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const id=String(event.notification.data?.notificationId||"");
  const target=new URL("./",self.registration.scope);
  if(id)target.searchParams.set("notification",id);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const win of windows){
      if(win.url.startsWith(self.registration.scope)){
        try{await win.navigate(target.href);await win.focus();return;}catch{}
      }
    }
    await self.clients.openWindow(target.href);
  })());
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
