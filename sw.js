const CACHE="exauddd-vault-cache-v26";
const ASSETS=["./","./index.html","./styles.css","./app.js","./importer.js","./bulk.js","./groups.js","./status.js","./status-bulk.js","./auth-fix.js","./bulk-delete.js","./navigation.js","./bulk-group.js","./paste-export.js","./bulk-username.js","./owner-splitter.js","./config-defaults.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(x=>x.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match("./index.html"))))});
