const CACHE_NAME = 'sarasvati-school-v1.4.0';
const APP_ASSETS = ['./','./index.html','./manifest.json','./version.json','./icon-192.png?v=4','./firebase-login.js?v=1','./firebase-sync.js?v=2'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => { if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(async res=>{
      let text=await res.text();
      if(!text.includes('firebase-login.js')) text=text.replace('</body>','<script src="./firebase-login.js?v=1"></script><script src="./firebase-sync.js?v=2"></script></body>');
      text=text.replaceAll('1.0.3','1.4.0');
      const headers=new Headers(res.headers);headers.set('content-type','text/html; charset=utf-8');
      const out=new Response(text,{status:res.status,statusText:res.statusText,headers});
      caches.open(CACHE_NAME).then(c=>c.put(req,out.clone()));
      return out;
    }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    return;
  }
  if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/manifest.json')||url.pathname.endsWith('/firebase-login.js')||url.pathname.endsWith('/firebase-sync.js')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return res;})));
});