import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Identyfikator builda. Trafia do UI (Ustawienia → Wersja) oraz do service workera,
 * dzięki czemu każdy deploy automatycznie unieważnia stary cache.
 */
function createBuildId(): string {
  const sha = process.env.GITHUB_SHA?.trim()
  if (sha) return sha.slice(0, 7)

  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
  ].join('')
}

/** Podmienia __BUILD_ID__ w public/service-worker.js po zakończeniu builda. */
function stampServiceWorker(buildId: string): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    writeBundle(options) {
      const file = resolve(process.cwd(), options.dir ?? 'dist', 'service-worker.js')
      const source = readFileSync(file, 'utf8')
      writeFileSync(file, source.replaceAll('__BUILD_ID__', buildId))
    },
  }
}

// W trybie dev wszystkie żądania /api są przekierowywane na lokalny backend,
// dzięki czemu nie trzeba konfigurować CORS na czas developmentu.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const buildId = createBuildId()

  const rawBase = (process.env.VITE_BASE || env.VITE_BASE || '/').trim()
  const base =
    rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`

  return {
    base,
    plugins: [react(), stampServiceWorker(buildId)],
    define: {
      __BUILD_ID__: JSON.stringify(buildId),
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['recharts'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  }
})
