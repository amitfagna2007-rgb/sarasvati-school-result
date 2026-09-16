const CACHE_NAME = 'sarasvati-school-v1.0.8';
const APP_ASSETS = ['./','./index.html','./manifest.json','./version.json','./icon-192.png?v=4','./firebase-auth.js?v=4','./login-guard.js?v=1'];
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
  if(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(async res=>{
      const text=await res.text();
      let injected=text;
      if(!injected.includes('firebase-auth.js')) injected=injected.replace('</head>','<script src="./firebase-auth.js?v=4"></script><script src="./login-guard.js?v=1"></script></head>');
      else if(!injected.includes('login-guard.js')) injected=injected.replace('</head>','<script src="./login-guard.js?v=1"></script></head>');
      const headers=new Headers(res.headers);headers.set('content-type','text/html; charset=utf-8');
      const out=new Response(injected,{status:res.status,statusText:res.statusText,headers});
      caches.open(CACHE_NAME).then(c=>c.put(req,out.clone()));
      return out;
    }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    return;
  }
  if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/manifest.json')||url.pathname.endsWith('/firebase-auth.js')||url.pathname.endsWith('/login-guard.js')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return res;})));
});