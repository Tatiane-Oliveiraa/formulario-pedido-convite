/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Service Worker
   Permite uso offline e instalação como app nativo
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'raiz-pixel-v2';

// Arquivos a cachear para funcionamento offline
const CACHE_FILES = [
  'app.html',
  'receber-pedido.html',
  'css/style.css',
  'js/dexie.min.js',
  'js/auth.js',
  'js/database.js',
  'js/clientes.js',
  'js/pedidos.js',
  'js/financeiro.js',
  'js/dashboard.js',
  'js/produtos.js',
  'js/pdf-generator.js',
  'js/notification.js',
  'img/logo.png',
  'manifest.json'
];

// Instalação: cachear todos os arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES).catch(err => {
        console.warn('[SW] Alguns arquivos não puderam ser cacheados:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação: limpar caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Requisições: servir do cache, fallback para rede
self.addEventListener('fetch', event => {
  // Ignorar requisições não-GET e extensões de navegador
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Tentar buscar da rede e cachear
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      }).catch(() => {
        // Offline e não cacheado — retornar página offline básica se for HTML
        if (event.request.destination === 'document') {
          return caches.match('app.html');
        }
      });
    })
  );
});
