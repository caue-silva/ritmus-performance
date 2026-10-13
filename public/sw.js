/*
 * Service worker do Ritmus.
 * - Arquivos estáticos (JS/CSS/fontes/ícones): cache para abrir rápido.
 * - Páginas: sempre da rede (são dados de alunos, com login) — nunca guardadas.
 *   Sem conexão, mostra /offline.html em vez do erro do navegador.
 * As medições sem internet ficam na fila do app (localStorage), não aqui.
 */
const VERSION = "ritmus-v1"
const STATIC = `static-${VERSION}`
const PRECACHE = ["/offline.html", "/logo-ritmus.png", "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const isStatic = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/logo-ritmus.png")

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)

  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC).then((c) => c.put(request, copy))
            }
            return res
          }),
      ),
    )
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")))
  }
})
