/*
 * Generuje ikony PNG z plików SVG (wymaga pakietu sharp).
 * Uruchomienie: npm i -D sharp && node scripts/render-icons.mjs
 * Ikony w public/icons są już wygenerowane — skrypt przydaje się po zmianie wzoru.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = path.join(root, 'public', 'icons')

async function render(source, size, target) {
  const svg = await readFile(path.join(iconsDir, source))
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, target))
  console.log(`✓ ${target} (${size}×${size})`)
}

await render('icon.svg', 192, 'icon-192.png')
await render('icon.svg', 512, 'icon-512.png')
await render('icon-maskable.svg', 512, 'maskable-512.png')
await render('icon-maskable.svg', 180, 'apple-touch-icon.png')
