self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', () => {
  return self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  // Lasciamo gestire tutto dalla rete, ci serve solo per far apparire il tasto "Installa"
});
