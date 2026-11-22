// Katalog mahsulotlari uchun professional SVG muqovalar yaratadi.
// Mavjud rasm fayllarini qayta yozmaydi (admin yuklagan rasmlar saqlanadi).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public', 'images')
fs.mkdirSync(out, { recursive: true })

const items = [
  ['Biznes landing page', 'web', '#16a34a', '#0b3b25', 'LND'],
  ['Onlayn do\'kon shabloni', 'web', '#0ea5e9', '#0b2940', 'SHP'],
  ['Portfolio sayt', 'web', '#a855f7', '#2a1340', 'PRT'],
  ['Instagram post shablonlari', 'design', '#ec4899', '#40132c', 'IG'],
  ['Logotip va brend to\'plami', 'design', '#f59e0b', '#402b0c', 'BRD'],
  ['UI Kit: mobil ilova', 'design', '#6366f1', '#171a44', 'UI'],
  ['Referat va taqdimot to\'plami', 'docs', '#14b8a6', '#0b3733', 'DOC'],
  ['Kurs ishi andozalari', 'docs', '#3b82f6', '#102447', 'DOC'],
  ['Ilmiy maqola yozish qo\'llanmasi', 'docs', '#8b5cf6', '#251540', 'PDF'],
  ['Noldan veb-dasturlash', 'video', '#ef4444', '#401414', 'WEB'],
  ['Figma darslari', 'video', '#f97316', '#40230d', 'FIG'],
  ['Telegram bot yaratish', 'video', '#22d3ee', '#0b3540', 'BOT'],
]

const escapeXml = (s) => String(s).replace(/[<>&"']/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[c])

items.forEach(([title, cat, accent, dark, tag], index) => {
  const file = path.join(out, `cover-${String(index + 1).padStart(2, '0')}.svg`)
  if (fs.existsSync(file)) return
  const n = String(index + 1).padStart(2, '0')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050f0a"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#22e05a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <circle cx="680" cy="90" r="190" fill="${accent}" opacity="0.10"/>
  <circle cx="120" cy="440" r="150" fill="#22e05a" opacity="0.06"/>
  <path d="M0 400 Q 200 330 400 400 T 800 390" fill="none" stroke="${accent}" stroke-width="2" opacity="0.25"/>
  <g transform="translate(56 52)">
    <rect width="82" height="34" rx="16" fill="${accent}" opacity="0.18" stroke="${accent}" stroke-opacity="0.5"/>
    <text x="41" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${tag}</text>
  </g>
  <text x="56" y="170" font-family="Arial,sans-serif" font-size="132" font-weight="800" fill="url(#acc)" opacity="0.9">${n}</text>
  <text x="56" y="280" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#f2fff5">${escapeXml(title.slice(0, 24))}</text>
  <text x="56" y="318" font-family="Arial,sans-serif" font-size="16" fill="#9fc4ac">MAXSELLER / ${cat.toUpperCase()}</text>
  <g transform="translate(56 366)">
    <rect width="180" height="6" rx="3" fill="#ffffff" opacity="0.12"/>
    <rect width="112" height="6" rx="3" fill="url(#acc)"/>
  </g>
</svg>`
  fs.writeFileSync(file, svg, 'utf8')
})
console.log(`Covers ready: ${items.length}`)
