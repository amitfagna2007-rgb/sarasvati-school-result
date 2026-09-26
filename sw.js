const CACHE_NAME='sarasvati-school-v1.4.47';
const APP_ASSETS=['./','./index.html','./manifest.json','./version.json','./icon-192.png?v=4','./firebase-login.js?v=4','./firebase-sync.js?v=7','./edit-fix.js?v=2'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 const isIndex=url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');
 const isScript=url.pathname.endsWith('/firebase-login.js')||url.pathname.endsWith('/firebase-sync.js');
 const isVersion=url.pathname.endsWith('/version.json');const isManifest=url.pathname.endsWith('/manifest.json');
 if(isVersion){event.respondWith(new Response('{"version":"1.4.47","updated":"2026-09-25","notes":"Fix safe two-device Firebase sync with three-way merge, deletion tombstones, and cloud conflict protection."}',{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}));return}
 if(isIndex){event.respondWith(fetch(new Request(req.url,{cache:'no-store'})).then(async res=>{let text=await res.text();text=text.replace(/1\.4\.31/g,'1.4.38').replace(/1\.4\.32/g,'1.4.38');const h=new Headers(res.headers);h.set('content-type','text/html; charset=utf-8');const out=new Response(text,{status:res.status,statusText:res.statusText,headers:h});caches.open(CACHE_NAME).then(c=>c.put('./index.html',out.clone()));return out}).catch(()=>caches.match('./index.html')));return}
 if(isScript||isManifest){event.respondWith(fetch(new Request(req.url,{cache:'no-store'})).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req)));return}
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return res}));
});