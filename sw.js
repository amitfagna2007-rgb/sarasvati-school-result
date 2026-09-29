const CACHE_NAME='sarasvati-school-v1.4.49';
const APP_ASSETS=['./','./index.html','./manifest.json','./version.json','./icon-192.png?v=4','./firebase-login.js?v=4','./firebase-sync.js?v=9','./edit-fix.js?v=2'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c=>c.addAll(APP_ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});

async function networkFirst(request,cacheKey){
  try{
    const res=await fetch(new Request(request,{cache:'no-store'}));
    if(res&&res.ok){
      const copy=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(cacheKey||request,copy)).catch(()=>{});
    }
    return res;
  }catch(e){
    return caches.match(cacheKey||request);
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  const isVersion=url.pathname.endsWith('/version.json');
  const isIndex=url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');
  const isScript=url.pathname.endsWith('/firebase-login.js')||url.pathname.endsWith('/firebase-sync.js');
  const isManifest=url.pathname.endsWith('/manifest.json');

  if(isVersion){
    event.respondWith(networkFirst(req,'./version.json'));
    return;
  }

  if(isIndex||isScript||isManifest){
    event.respondWith(networkFirst(req,isIndex?'./index.html':req));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      if(res&&res.ok)caches.open(CACHE_NAME).then(c=>c.put(req,res.clone())).catch(()=>{});
      return res;
    }).catch(()=>cached))
  );
});
