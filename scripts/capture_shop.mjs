import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import os from 'node:os'

// Capture ONLY customer-facing MAXSELLER screens for the shop advertisement.
const OUT = path.join(process.env.TEMP || os.tmpdir(), 'maxseller-shop-ad', 'ui')
fs.mkdirSync(OUT, { recursive: true })
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9344
const BASE = 'http://127.0.0.1:3001'
const DEMO_UID = 'usr_f4a7c568ae027a4d38804660' // existing neutral "Demo Client"

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), 'maxseller-app/.env'), 'utf8')
    .split(/\r?\n/).filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const tokenBody = Buffer.from(JSON.stringify({
  uid: DEMO_UID, role: 'customer', exp: Date.now() + 24 * 3600 * 1000,
})).toString('base64url')
const token = `${tokenBody}.${crypto.createHmac('sha256', env.JWT_SECRET).update(tokenBody).digest('base64url')}`

async function api(url, method, body) {
  const r = await fetch(BASE + url, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`${method || 'GET'} ${url}: ${r.status} ${text.slice(0, 160)}`)
  return text ? JSON.parse(text) : {}
}

// Real cart + real order through the actual customer API (neutral demo data only).
await api('/api/cart', 'PUT', { items: [
  { productId: '1', quantity: 1 },
  { productId: '4', quantity: 1 },
  { productId: '10', quantity: 1 },
] })
const created = await api('/api/orders', 'POST', {
  idempotencyKey: crypto.randomUUID(),
  type: 'instant',
  customer: { name: 'Demo Client', phone: '+998901234567', notes: '' },
  items: [
    { productId: '1', quantity: 1 },
    { productId: '4', quantity: 1 },
    { productId: '10', quantity: 1 },
  ],
  paymentMethod: 'card',
})
const orderId = created.order.id
console.log(`demo order: ${created.order.orderNumber} (${orderId})`)

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(OUT, 'cdp-shop')}`,
  'about:blank',
], { windowsHide: true, stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 60; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    target = list.find((t) => t.type === 'page')
    if (target) break
  } catch { /* starting */ }
  await sleep(400)
}
if (!target) throw new Error('Chrome debugging target unavailable')

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let seq = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})

await send('Emulation.setDeviceMetricsOverride', {
  width: 1080, height: 1600, deviceScaleFactor: 1, mobile: true,
})
await send('Page.enable')
await send('Page.navigate', { url: `${BASE}/` })
await sleep(1600)
await send('Runtime.evaluate', {
  expression: `localStorage.setItem('maxseller_customer_token', ${JSON.stringify(token)})`,
})
await send('Page.reload', { ignoreCache: true })
await sleep(2200)

async function shot(name, hash, scrollId) {
  await send('Runtime.evaluate', { expression: `window.location.hash=${JSON.stringify(hash || '/')}` })
  await sleep(1500)
  if (scrollId) {
    await send('Runtime.evaluate', {
      expression: `(()=>{const e=${scrollId.startsWith('.') || scrollId.startsWith('section') || scrollId.startsWith('#')
        ? `document.querySelector(${JSON.stringify(scrollId)})`
        : `document.getElementById(${JSON.stringify(scrollId)})`};if(e)e.scrollIntoView({block:'start',behavior:'instant'});})()`,
    })
    await sleep(700)
  }
  const text = await send('Runtime.evaluate', { expression: 'document.body.innerText.replace(/\\s+/g," ").slice(0,110)' })
  console.log(`  ${name}: ${text.result.value}`)
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = path.join(OUT, name + '.png')
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'))
  console.log(`  -> ${file} (${fs.statSync(file).size} bytes)`)
}

await shot('shop-hero', '/', 'top')
await shot('shop-categories', '/', 'section.cats')
await shot('shop-catalog', '/catalog', 'katalog')
await shot('shop-product-1', '/product/1')
await shot('shop-product-10', '/product/10')
await shot('shop-howto', '/', 'qanday')
await shot('shop-features', '/', 'afzallik')
await shot('shop-checkout', '/checkout')
await shot('shop-success', `/success/${orderId}`)
await shot('shop-order', `/order/${orderId}`)

ws.close()
chrome.kill()
