const CACHE='d7comercial-v2.2-stable';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./migrar.html','./sync-guard.js'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

async function injectGuard(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const text=await response.text();
  if(text.includes('sync-guard.js'))return new Response(text,{status:response.status,statusText:response.statusText,headers:response.headers});
  const injected=text.replace('</body>','<script src="./sync-guard.js?v=2.2-stable"></script></body>');
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(injected,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isAppNavigation=event.request.mode==='navigate' && url.origin===self.location.origin && url.pathname.startsWith('/d7core-pedidos/');

  if(isAppNavigation){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        const copy=fresh.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return injectGuard(fresh);
      }catch{
        const cached=await caches.match(event.request)||await caches.match('./index.html');
        return injectGuard(cached);
      }
    })());
    return;
  }

  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request))
  );
});
