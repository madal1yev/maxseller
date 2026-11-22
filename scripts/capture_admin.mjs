import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

// Capture REAL admin screens from the running local server via Chrome DevTools Protocol.
const OUT = path.join(process.env.TEMP || os.tmpdir(), 'maxseller-commercial', 'ui')
fs.mkdirSync(OUT, { recursive: true })
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9333
const BASE = 'http://127.0.0.1:3001'

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), 'maxseller-app/.env'), 'utf8')
    .split(/\r?\n/).filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

const login = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: env.ADMIN_PASSWORD || 'admin123' }),
})
if (!login.ok) throw new Error(`Admin login failed: ${login.status}`)
const token = (await login.json()).token
if (!token) throw new Error('No admin token returned')

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(OUT, 'cdp-profile')}`,
  'about:blank',
], { windowsHide: true, stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 60; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    target = list.find((t) => t.type === 'page')
    if (target) break
  } catch { /* Chrome still starting */ }
  await sleep(500)
}
if (!target) throw new Error('Chrome debugging target unavailable')

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let seq = 0
const pending = new Map()
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
  }
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.enable')
await send('Page.navigate', { url: `${BASE}/admin.html` })
await sleep(1500)
await send('Runtime.evaluate', {
  expression: `localStorage.setItem('maxseller_admin_token', ${JSON.stringify(token)})`,
})
await send('Page.reload', { ignoreCache: true })
await sleep(2200)

for (const section of ['dashboard', 'orders', 'products', 'customers']) {
  await send('Runtime.evaluate', { expression: `window.location.hash='${section}'` })
  await sleep(1400)
  const text = await send('Runtime.evaluate', { expression: 'document.body.innerText.slice(0,160)' })
  console.log(`  ${section}: ${String(text.result.value).replace(/\s+/g, ' ').slice(0, 120)}`)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = path.join(OUT, `admin-${section}.png`)
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
  console.log(`${file} (${fs.statSync(file).size} bytes)`)
}

ws.close()
chrome.kill()
