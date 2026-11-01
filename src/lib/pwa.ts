/**
 * Rejestracja service workera i automatyczne aktualizacje.
 *
 * Nowy build ma inny BUILD_ID, więc przeglądarka wykrywa zmianę pliku SW.
 * Worker wywołuje skipWaiting(), a po przejęciu kontroli strona odświeża się
 * sama — bez ręcznego podnoszenia wersji i bez „starej” wersji u użytkownika.
 */

let registration: ServiceWorkerRegistration | null = null

export function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  if (!import.meta.env.PROD) {
    // W trybie dev service worker tylko przeszkadza (stary cache po buildzie).
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((item) => void item.unregister()))
      .catch(() => undefined)
    return
  }

  let hasController = Boolean(navigator.serviceWorker.controller)
  let reloading = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Pierwsza instalacja — strona ma już aktualne pliki, reload nie jest potrzebny.
    if (!hasController) {
      hasController = true
      return
    }
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  const register = async () => {
    try {
      const item = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}service-worker.js`,
        {
          scope: import.meta.env.BASE_URL,
          // Główny plik SW zawsze z sieci, bez cache HTTP.
          updateViaCache: 'none',
        },
      )
      registration = item

      const check = () => {
        if (document.visibilityState !== 'visible') return
        void item.update().catch(() => undefined)
      }

      // Sprawdź od razu, potem cyklicznie i przy powrocie do karty / sieci.
      check()
      window.setInterval(check, 60_000)
      document.addEventListener('visibilitychange', check)
      window.addEventListener('online', check)
    } catch (error) {
      console.warn('Rejestracja service workera nie powiodła się:', error)
    }
  }

  window.addEventListener('load', () => void register())
}

export type UpdateCheckResult = 'updated' | 'current' | 'unsupported'

/** Ręczne sprawdzenie aktualizacji (Ustawienia → Aplikacja PWA). */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!('serviceWorker' in navigator)) return 'unsupported'

  const item = registration ?? (await navigator.serviceWorker.getRegistration())
  if (!item) return 'unsupported'

  await item.update()
  return item.installing || item.waiting ? 'updated' : 'current'
}
