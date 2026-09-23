/* Falo · service worker v8
   - SEMPRE rede primeiro para páginas (com no-store): o app NUNCA trava numa versão velha.
   - Cacheia só o "shell" leve (home + ícones) para instalar/abrir offline.
   - NÃO cacheia as aulas (são pesadas, ~200MB) — evita estourar o armazenamento do celular.
   - Auto-atualiza: assume o controle na hora e limpa caches antigos. */
const CACHE = "falo-v20";
const SHELL = ["index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Google Fonts etc. passam direto

  const isPage = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    // Rede primeiro, ignorando o cache do navegador → sempre a versão mais nova.
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: "no-store" });
        // Cacheia SÓ a home (shell) p/ abrir offline; nunca as aulas pesadas.
        if (res && res.status === 200 && (url.pathname === "/" || url.pathname.endsWith("/index.html"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("index.html", copy)).catch(() => {});
        }
        return res;
      } catch (err) {
        // Offline: tenta a própria página, senão cai na home guardada.
        const cached = await caches.match(req);
        if (cached) return cached;
        const idx = await caches.match("index.html");
        if (idx) return idx;
        throw err;
      }
    })());
    return;
  }

  // Só ícones/manifest entram no cache (cache-first). Todo o resto (inclui .html
  // que não seja navegação) vai direto pra rede, SEM guardar — nunca enche o armazenamento.
  const isAsset = /\.(png|ico|svg|webmanifest)$/.test(url.pathname);
  e.respondWith((async () => {
    if (isAsset) {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      } catch (err) {
        return cached || Response.error();
      }
    }
    try { return await fetch(req); }
    catch (err) { return (await caches.match(req)) || Response.error(); }
  })());
});
