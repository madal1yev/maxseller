import fs from 'node:fs'
import path from 'node:path'

// Deterministic, dependency-free product artwork for the MaxSeller catalog.
// Generates 12 premium emerald/neon SVG mockups used from /public/images.
const outDir = path.resolve('maxseller-app/public/images')
fs.mkdirSync(outDir, { recursive: true })
const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const defs = (accent) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#04120c"/><stop offset="1" stop-color="#0a3a26"/>
    </linearGradient>
    <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#5ef2a0"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".10"/><stop offset="1" stop-color="#ffffff" stop-opacity=".02"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="34"/></filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000" flood-opacity=".45"/>
    </filter>
  </defs>`

const background = (accent) => `
  <rect width="800" height="500" fill="url(#bg)"/>
  <circle cx="690" cy="70" r="220" fill="${accent}" opacity=".16" filter="url(#blur)"/>
  <circle cx="120" cy="470" r="180" fill="#22e05a" opacity=".08" filter="url(#blur)"/>
  <g stroke="#7dffb2" stroke-opacity=".07" stroke-width="1">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${40 + i * 42}" x2="800" y2="${40 + i * 42}"/>`).join('')}
    ${Array.from({ length: 15 }, (_, i) => `<line x1="${40 + i * 54}" y1="0" x2="${40 + i * 54}" y2="500"/>`).join('')}
  </g>
  <path d="M0 430 Q 200 360 400 430 T 800 420" fill="none" stroke="${accent}" stroke-opacity=".25" stroke-width="2"/>`

const label = (num, category, title, sub, accent) => `
  <g>
    <rect x="56" y="44" width="126" height="32" rx="16" fill="${accent}" fill-opacity=".16" stroke="${accent}" stroke-opacity=".5"/>
    <text x="119" y="65" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#eafff1">${esc(category)}</text>
    <text x="52" y="176" font-family="Arial,sans-serif" font-size="118" font-weight="800" fill="url(#acc)" opacity=".85">${esc(num)}</text>
    <text x="56" y="244" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#f3fff7">${esc(title)}</text>
    <text x="56" y="278" font-family="Arial,sans-serif" font-size="14" letter-spacing="2" fill="#9fc7ad">${esc(sub)}</text>
    <rect x="56" y="320" width="188" height="6" rx="3" fill="#ffffff" opacity=".12"/>
    <rect x="56" y="320" width="112" height="6" rx="3" fill="url(#acc)"/>
  </g>`

const browser = (x, y, w, h, scale = 1, inner = '') => `
  <g transform="translate(${x} ${y}) scale(${scale})" filter="url(#shadow)">
    <rect width="${w}" height="${h}" rx="18" fill="#082016" stroke="#7dffb2" stroke-opacity=".25"/>
    <path d="M0 18 A18 18 0 0 1 18 0 H${w - 18} A18 18 0 0 1 ${w} 18 V46 H0 Z" fill="#0d2c1e"/>
    <circle cx="22" cy="23" r="5" fill="#ff6b6b"/><circle cx="40" cy="23" r="5" fill="#ffd166"/><circle cx="58" cy="23" r="5" fill="#3ddc84"/>
    <rect x="86" y="16" width="${w - 116}" height="14" rx="7" fill="#ffffff" opacity=".08"/>
    ${inner}
  </g>`

const phone = (x, y, scale = 1, inner = '', accent = '#22e05a') => `
  <g transform="translate(${x} ${y}) scale(${scale})" filter="url(#shadow)">
    <rect width="150" height="290" rx="26" fill="#061a11" stroke="${accent}" stroke-opacity=".45" stroke-width="2"/>
    <rect x="52" y="10" width="46" height="7" rx="4" fill="#ffffff" opacity=".18"/>
    ${inner}
  </g>`

const uiLine = (x, y, w, fill = '#ffffff', o = '.55') => `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${fill}" opacity="${o}"/>`
const uiCard = (x, y, w, h, accent = '#22e05a') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#glass)" stroke="${accent}" stroke-opacity=".22"/>`

const scenes = {
  1: () => `
    ${browser(410, 118, 342, 240, 1, `
      ${uiLine(76, 70, 150, '#5ef2a0', '.8')}${uiLine(76, 92, 210)}${uiLine(76, 110, 170, '#ffffff', '.3')}
      <rect x="76" y="136" width="90" height="30" rx="8" fill="#22e05a" opacity=".9"/>
      <rect x="176" y="136" width="70" height="30" rx="8" fill="#ffffff" opacity=".12"/>
      ${uiCard(76, 182, 92, 42)}${uiCard(180, 182, 92, 42)}${uiCard(76, 234, 92, 42)}
    `)}
    ${phone(668, 176, .88, `
      ${uiLine(18, 38, 90, '#5ef2a0', '.8')}${uiLine(18, 58, 110, '#ffffff', '.4')}
      ${uiCard(18, 84, 114, 62)}${uiCard(18, 158, 114, 42)}${uiCard(18, 212, 114, 42)}
      <rect x="18" y="266" width="114" height="16" rx="8" fill="#22e05a" opacity=".85"/>
    `)}
    <circle cx="728" cy="120" r="26" fill="#22e05a" opacity=".18"/><path d="M718 120 l8 8 14 -18" stroke="#5ef2a0" stroke-width="4" fill="none"/>`,

  2: () => `
    ${browser(398, 112, 356, 252, 1, `
      <rect x="288" y="14" width="52" height="18" rx="9" fill="#22e05a" opacity=".85"/>
      ${uiCard(76, 62, 86, 104)}${uiCard(176, 62, 86, 104)}${uiCard(76, 180, 86, 104)}${uiCard(176, 180, 86, 104)}
      <circle cx="119" cy="100" r="20" fill="#22e05a" opacity=".28"/><circle cx="219" cy="100" r="20" fill="#5ef2a0" opacity=".22"/>
      ${uiLine(86, 142, 60, '#ffffff', '.35')}${uiLine(186, 142, 60, '#ffffff', '.35')}
    `)}
    ${phone(690, 178, .82, `
      ${uiLine(18, 38, 80, '#5ef2a0', '.8')}
      ${uiCard(18, 64, 114, 70)}${uiCard(18, 146, 114, 70)}
      <rect x="18" y="232" width="114" height="22" rx="7" fill="#22e05a" opacity=".9"/>
    `)}`,

  3: () => `
    ${browser(402, 120, 344, 238, 1, `
      <circle cx="104" cy="88" r="26" fill="#22e05a" opacity=".3"/>
      ${uiLine(146, 72, 140, '#5ef2a0', '.8')}${uiLine(146, 92, 180, '#ffffff', '.45')}${uiLine(146, 110, 120, '#ffffff', '.25')}
      ${uiCard(76, 148, 92, 76)}${uiCard(180, 148, 92, 76)}${uiCard(76, 236, 92, 76)}
      <rect x="270" y="16" width="52" height="18" rx="9" fill="#ffffff" opacity=".14"/>
      <circle cx="282" cy="25" r="5" fill="#5ef2a0"/><circle cx="308" cy="25" r="5" fill="#ffffff" opacity=".3"/>
    `)}
    ${phone(682, 186, .78, `
      ${uiLine(18, 40, 100, '#5ef2a0', '.8')}
      ${uiCard(18, 66, 114, 90)}${uiCard(18, 168, 114, 60)}
    `)}`,

  4: () => `
    <g transform="translate(410 84)" filter="url(#shadow)">
      ${Array.from({ length: 12 }, (_, i) => {
        const x = (i % 4) * 84
        const y = Math.floor(i / 4) * 100
        const c = ['#22e05a', '#5ef2a0', '#0e9f5c', '#a7ffcf'][i % 4]
        return `<rect x="${x}" y="${y}" width="72" height="88" rx="10" fill="url(#glass)" stroke="${c}" stroke-opacity=".35"/>
          <rect x="${x + 8}" y="${y + 8}" width="56" height="40" rx="6" fill="${c}" opacity=".28"/>
          ${uiLine(x + 8, y + 58, 46, '#ffffff', '.4')}${uiLine(x + 8, y + 70, 34, '#ffffff', '.22')}`
      }).join('')}
    </g>
    ${phone(700, 172, .9, `
      ${uiCard(18, 38, 114, 176, '#5ef2a0')}
      <circle cx="75" cy="94" r="22" fill="#22e05a" opacity=".4"/>
      ${uiLine(34, 138, 82, '#ffffff', '.5')}${uiLine(34, 154, 60, '#ffffff', '.25')}
      <circle cx="75" cy="230" r="9" fill="#22e05a" opacity=".7"/><circle cx="75" cy="258" r="9" fill="#ffffff" opacity=".2"/>
    `)}`,

  5: () => `
    <g transform="translate(402 92)" filter="url(#shadow)">
      <rect width="360" height="286" rx="20" fill="#082016" stroke="#7dffb2" stroke-opacity=".25"/>
      ${uiLine(26, 34, 120, '#5ef2a0', '.85')}
      <rect x="26" y="62" width="96" height="72" rx="12" fill="#ffffff" opacity=".05"/>
      <path d="M42 118 L74 78 L106 118" stroke="#5ef2a0" stroke-width="6" fill="none"/>
      <rect x="138" y="62" width="96" height="72" rx="12" fill="#ffffff" opacity=".05"/>
      <circle cx="186" cy="98" r="22" stroke="#22e05a" stroke-width="6" fill="none"/>
      <rect x="250" y="62" width="84" height="72" rx="12" fill="#ffffff" opacity=".05"/>
      <path d="M266 122 L292 76 L318 122 Z" fill="#5ef2a0" opacity=".8"/>
      ${['#22e05a', '#5ef2a0', '#0e9f5c', '#e8fff0', '#123f2b'].map((c, i) => `<circle cx="${40 + i * 30}" cy="176" r="12" fill="${c}"/>`).join('')}
      ${uiLine(26, 210, 150, '#ffffff', '.4')}${uiLine(26, 228, 110, '#ffffff', '.22')}
      <rect x="26" y="252" width="180" height="16" rx="6" fill="url(#acc)" opacity=".8"/>
    </g>`,

  6: () => `
    ${phone(408, 82, .92, `
      ${uiLine(18, 38, 96, '#5ef2a0', '.8')}${uiCard(18, 60, 114, 74)}
      ${uiCard(18, 146, 52, 52)}${uiCard(82, 146, 50, 52)}${uiCard(18, 210, 114, 42)}
    `)}
    ${phone(560, 118, .92, `
      ${uiCard(18, 38, 114, 96, '#5ef2a0')}${uiLine(18, 150, 90)}${uiLine(18, 168, 110, '#ffffff', '.3')}
      ${uiCard(18, 190, 114, 62)}
    `)}
    ${phone(712, 82, .92, `
      ${uiLine(18, 38, 80, '#5ef2a0', '.8')}
      ${Array.from({ length: 4 }, (_, i) => `<rect x="18" y="${64 + i * 48}" width="114" height="36" rx="8" fill="url(#glass)" stroke="#7dffb2" stroke-opacity=".2"/>`).join('')}
    `)}`,

  7: () => `
    <g transform="translate(412 104)" filter="url(#shadow)">
      <rect x="30" y="18" width="164" height="220" rx="10" fill="#f2fff7" opacity=".94"/>
      ${uiLine(48, 44, 100, '#0a3a26', '.75')}${uiLine(48, 62, 128, '#0a3a26', '.35')}
      ${['#22e05a', '#5ef2a0', '#0e9f5c'].map((c, i) => `<rect x="48" y="${92 + i * 24}" width="${110 - i * 18}" height="7" rx="3" fill="${c}" opacity=".7"/>`).join('')}
      <rect x="48" y="178" width="128" height="42" rx="6" fill="#0a3a26" opacity=".08"/>
      <path d="M56 208 L78 190 L98 200 L120 182 L150 194" stroke="#22e05a" stroke-width="3" fill="none"/>
    </g>
    <g transform="translate(594 88)" filter="url(#shadow)">
      <rect width="190" height="120" rx="12" fill="#082016" stroke="#5ef2a0" stroke-opacity=".4"/>
      ${uiLine(18, 24, 90, '#5ef2a0', '.8')}
      ${[40, 62, 84, 106].map((h, i) => `<rect x="${20 + i * 40}" y="${104 - h}" width="24" height="${h}" rx="4" fill="${i % 2 ? '#22e05a' : '#5ef2a0'}" opacity=".8"/>`).join('')}
    </g>
    <g transform="translate(614 224)" filter="url(#shadow)">
      <rect width="190" height="110" rx="12" fill="#082016" stroke="#22e05a" stroke-opacity=".3"/>
      <circle cx="96" cy="55" r="34" fill="none" stroke="#5ef2a0" stroke-width="12" stroke-dasharray="150 60" opacity=".85"/>
    </g>`,

  8: () => `
    <g transform="translate(414 78)" filter="url(#shadow)">
      <rect width="222" height="320" rx="12" fill="#f4fff8" opacity=".96"/>
      ${uiLine(30, 40, 120, '#0a3a26', '.8')}${uiLine(30, 62, 160, '#0a3a26', '.35')}${uiLine(30, 80, 140, '#0a3a26', '.25')}
      ${uiLine(30, 122, 80, '#22e05a', '.8')}
      ${Array.from({ length: 6 }, (_, i) => `<rect x="30" y="${150 + i * 22}" width="${150 - (i % 3) * 22}" height="6" rx="3" fill="#0a3a26" opacity=".28"/>`).join('')}
      <rect x="30" y="288" width="70" height="14" rx="5" fill="#22e05a" opacity=".7"/>
    </g>
    <g transform="translate(652 132)" filter="url(#shadow)">
      <rect width="120" height="210" rx="10" fill="#082016" stroke="#7dffb2" stroke-opacity=".3"/>
      ${uiLine(18, 30, 70, '#5ef2a0', '.8')}
      ${Array.from({ length: 5 }, (_, i) => uiLine(18, 60 + i * 24, 80 - (i % 2) * 20, '#ffffff', '.35')).join('')}
    </g>
    <path d="M704 356 l34 -82 12 5 -34 82 z" fill="#5ef2a0" opacity=".85"/>
    <path d="M738 274 l10 -18 8 14 -18 4" fill="#e8fff0" opacity=".8"/>`,

  9: () => `
    <g transform="translate(404 100)" filter="url(#shadow)">
      <rect width="150" height="250" rx="12" fill="#0a2c1e" stroke="#5ef2a0" stroke-opacity=".45"/>
      <rect x="18" y="24" width="114" height="52" rx="8" fill="url(#acc)" opacity=".8"/>
      ${uiLine(18, 100, 104, '#ffffff', '.5')}${uiLine(18, 122, 84, '#ffffff', '.28')}
      ${Array.from({ length: 5 }, (_, i) => uiLine(18, 158 + i * 18, 110 - (i % 2) * 24, '#ffffff', '.3')).join('')}
    </g>
    <g transform="translate(570 118)" filter="url(#shadow)">
      <rect width="212" height="250" rx="12" fill="#f4fff8" opacity=".95"/>
      ${uiLine(26, 34, 130, '#0a3a26', '.75')}
      ${[0, 1, 2, 3].map((i) => `<rect x="26" y="${66 + i * 34}" width="160" height="12" rx="4" fill="#0a3a26" opacity=".16"/><rect x="26" y="${66 + i * 34}" width="${70 + i * 18}" height="12" rx="4" fill="#5ef2a0" opacity=".55"/>`).join('')}
      ${uiLine(26, 210, 120, '#0a3a26', '.35')}
    </g>
    <circle cx="742" cy="120" r="28" fill="#22e05a" opacity=".2"/><path d="M730 120 l9 9 16 -20" stroke="#5ef2a0" stroke-width="4" fill="none"/>`,

  10: () => `
    ${browser(402, 96, 356, 268, 1, `
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="76" y="${64 + i * 26}" width="${18 + (i % 4) * 16}" height="7" rx="3" fill="#5ef2a0" opacity=".7"/><rect x="${104 + (i % 3) * 18}" y="${64 + i * 26}" width="${120 - i * 8}" height="7" rx="3" fill="${['#ffd166', '#7dffb2', '#8ab4ff', '#ff9ecb'][i % 4]}" opacity=".7"/>`).join('')}
      <rect x="270" y="56" width="52" height="22" rx="6" fill="#22e05a" opacity=".4"/>
    `)}
    <circle cx="700" cy="330" r="38" fill="#22e05a" opacity=".22"/><circle cx="700" cy="330" r="26" fill="#5ef2a0" opacity=".9"/>
    <path d="M692 317 l20 13 -20 13 z" fill="#04120c"/>
    <g font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#eafff1">
      <rect x="436" y="372" width="54" height="24" rx="12" fill="#ffffff" opacity=".1"/><text x="463" y="388" text-anchor="middle">HTML</text>
      <rect x="498" y="372" width="50" height="24" rx="12" fill="#ffffff" opacity=".1"/><text x="523" y="388" text-anchor="middle">CSS</text>
      <rect x="556" y="372" width="46" height="24" rx="12" fill="#ffffff" opacity=".1"/><text x="579" y="388" text-anchor="middle">JS</text>
    </g>`,

  11: () => `
    <g transform="translate(400 88)" filter="url(#shadow)">
      <rect width="260" height="300" rx="16" fill="#082016" stroke="#7dffb2" stroke-opacity=".3"/>
      <rect x="0" y="0" width="60" height="300" rx="16" fill="#0d2c1e"/>
      ${['#22e05a', '#5ef2a0', '#ffffff', '#0e9f5c', '#a7ffcf'].map((c, i) => `<rect x="14" y="${26 + i * 28}" width="32" height="18" rx="5" fill="${c}" opacity=".55"/>`).join('')}
      ${uiLine(80, 30, 120, '#5ef2a0', '.8')}
      <rect x="80" y="58" width="160" height="110" rx="10" fill="url(#glass)" stroke="#22e05a" stroke-opacity=".3"/>
      ${uiLine(96, 82, 100, '#ffffff', '.5')}${uiLine(96, 104, 128, '#ffffff', '.25')}${uiLine(96, 126, 80, '#ffffff', '.35')}
      ${uiCard(80, 184, 74, 70)}${uiCard(164, 184, 76, 70)}
      <path d="M228 246 l16 -22 12 10 -16 22 z" fill="#5ef2a0" opacity=".85"/>
    </g>
    ${phone(684, 148, .82, `
      ${uiLine(18, 38, 90, '#5ef2a0', '.8')}${uiCard(18, 64, 114, 110)}
      ${uiLine(34, 190, 82, '#ffffff', '.4')}${uiLine(34, 208, 60, '#ffffff', '.25')}
    `)}`,

  12: () => `
    ${browser(396, 96, 348, 264, 1, `
      <rect x="76" y="62" width="132" height="34" rx="12" fill="#22e05a" opacity=".22"/>
      ${uiLine(92, 76, 100, '#d9ffe8', '.8')}
      <rect x="158" y="110" width="126" height="34" rx="12" fill="url(#glass)" stroke="#7dffb2" stroke-opacity=".25"/>
      ${uiLine(174, 124, 94, '#ffffff', '.5')}
      ${uiLine(76, 168, 180, '#ffffff', '.3')}${uiLine(76, 190, 140, '#ffffff', '.2')}
      <rect x="76" y="220" width="208" height="30" rx="8" fill="#06180f" stroke="#22e05a" stroke-opacity=".3"/>
      <circle cx="94" cy="235" r="4" fill="#5ef2a0"/>${uiLine(108, 232, 120, '#5ef2a0', '.55')}
    `)}
    <g transform="translate(690 150)" filter="url(#shadow)">
      <circle cx="46" cy="46" r="46" fill="#22e05a" opacity=".22"/>
      <path d="M22 48 l48 -24 -14 48 -12 -18 z" fill="#5ef2a0"/>
    </g>
    <g transform="translate(438 376)" font-family="Arial,sans-serif" font-size="11" fill="#9fc7ad">
      <text x="0" y="0">/start</text><text x="76" y="0">/catalog</text><text x="172" y="0">/order</text>
    </g>`,
}

const products = [
  ['01', 'VEB', 'Landing page', 'TAYYOR SAYT', '#16a34a'],
  ['02', 'VEB', "Online do'kon", 'E-COMMERCE', '#22c55e'],
  ['03', 'VEB', 'Portfolio sayt', 'SHARTNOMA', '#4ade80'],
  ['04', 'DIZAYN', 'Post & Story', '30 TA ANDOZA', '#86efac'],
  ['05', 'DIZAYN', 'Brand kit', 'LOGO + STIL', '#16a34a'],
  ['06', 'DIZAYN', 'Mobile UI Kit', '120+ EKRAN', '#22c55e'],
  ['07', 'HUJJAT', 'Taqdimot', 'SLIDE + REPORT', '#4ade80'],
  ['08', 'HUJJAT', 'Kurs ishi', 'GOST ANDOZA', '#86efac'],
  ['09', 'HUJJAT', 'Maqola', 'PDF QOLLANMA', '#16a34a'],
  ['10', 'VIDEO', 'Veb dasturlash', 'HTML CSS JS', '#22c55e'],
  ['11', 'VIDEO', 'Figma darslari', 'DIZAYN KURS', '#4ade80'],
  ['12', 'VIDEO', 'Telegram bot', 'AVTOMATLASHTIRISH', '#86efac'],
]

for (const [num, cat, title, sub, accent] of products) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" role="img" aria-label="${esc(title)}">
${defs(accent)}${background(accent)}${label(num, cat, title, sub, accent)}${scenes[Number(num)]()}
</svg>
`
  fs.writeFileSync(path.join(outDir, `cover-${num}.svg`), svg, 'utf8')
}

console.log(`Generated ${products.length} product covers in ${outDir}`)
