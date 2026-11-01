/*
 * Service Worker — Garmin Pulpit
 *
 * Strategie:
 *  - nawigacja (HTML): network-first z fallbackiem do cache (offline shell),
 *  - API (GET /api/...): network-first, cache ostatniej udanej odpowiedzi,
 *  - statyczne zasoby: stale-while-revalidate.
 *
 * BUILD_ID jest wstawiany automatycznie przy każdym buildzie (vite.config.ts).
 * Nie trzeba ręcznie podnosić wersji — każdy nowy build ma nowe nazwy cache,
 * a stara wersja jest usuwana przy aktywacji.
 */
const BUILD_ID = '__BUILD_ID__'

// Adres bazowy aplikacji (obsługuje też hosting w podkatalogu, np. GitHub Pages).
const BASE = new URL('./', self.location.href).pathname

const SHELL_CACHE = `gp-shell-${BUILD_ID}`
const RUNTIME_CACHE = `gp-runtime-${BUILD_ID}`
const API_CACHE = `gp-api-${BUILD_ID}`

const SHELL_ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
  `${BASE}icons/favicon.svg`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE)
        await cache.addAll(SHELL_ASSETS)
      } catch {
        // Brak sieci przy instalacji — aplikacja i tak wystartuje z cache runtime.
      }
      // Nowy worker przejmuje kontrolę od razu; strona odświeży się w main.tsx.
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('gp-') &&
              ![SHELL_CACHE, RUNTIME_CACHE, API_CACHE].includes(key),
          )
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (data === 'SKIP_WAITING' || data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }
  if (data?.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({ buildId: BUILD_ID })
  }
})

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
}

async function networkFirst(request, cacheName, timeoutMs, init) {
  const cache = await caches.open(cacheName)
  try {
    const response = await Promise.race([fetch(request, init), timeout(timeoutMs)])
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => Response.error())

  return cached || network
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!url.protocol.startsWith('http')) return
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      // no-cache wymusza rewalidację HTML, żeby po wdrożeniu nie zostać na starej wersji.
      networkFirst(request, SHELL_CACHE, 4000, { cache: 'no-cache' }).catch(async () => {
        const cache = await caches.open(SHELL_CACHE)
        return (
          (await cache.match(`${BASE}index.html`)) ||
          (await cache.match(BASE)) ||
          new Response('Aplikacja jest offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        )
      }),
    )
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirst(request, API_CACHE, 9000).catch(
        () =>
          new Response(JSON.stringify({ detail: 'Brak połączenia z API (offline).' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }),
      ),
    )
    return
  }

  if (['script', 'style', 'font', 'image'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
  }
})
