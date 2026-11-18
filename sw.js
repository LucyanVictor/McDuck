// Service worker: guarda os arquivos do app para abrir rápido e funcionar como app instalado.
const CACHE = 'mcduck-v8';
const ARQUIVOS = ['./', 'index.html', 'style.css', 'config.js', 'core.js', 'pages1.js', 'pages2.js', 'pages3.js', 'app.js', 'manifest.json', 'icone.svg', 'logo.svg', 'icone-192.png', 'icone-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase e CDNs: sempre pela rede
  const semCache = /config\.js$|index\.html$|\/$/.test(url.pathname);
  e.respondWith(fetch(e.request, semCache ? { cache: 'no-store' } : undefined).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
