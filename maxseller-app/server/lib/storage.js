// Private disk storage + base64 upload validation. Fayllar frontendga to'g'ridan-to'g'ri emas,
// faqat /media endpoint orqali (rasm) yoki himoyalangan /api/download orqali beriladi.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { config, imagesDir, filesDir, receiptsDir, uid } from './core.js'

const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

const PRODUCT_MIME_EXT = {
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/json': 'json',
}

export function parseDataUrl(input) {
  if (typeof input !== 'string') return null
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(input.trim())
  if (!match) return null
  const mime = match[1].toLowerCase()
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  return { mime, buffer }
}

function save(buffer, dir, ext, prefix) {
  const name = `${prefix}${uid()}.${ext}`
  fs.writeFileSync(path.join(dir, name), buffer)
  return name
}

export function saveImage(input, label = 'img') {
  const parsed = parseDataUrl(input)
  if (!parsed) throw new Error('Rasm formati noto\'g\'ri (PNG, JPG, WEBP yoki GIF yuboring)')
  if (!MIME_EXT[parsed.mime]) throw new Error('Faqat PNG, JPG, WEBP, GIF va SVG rasm formatlari qabul qilinadi')
  const maxBytes = config.limits.imageMb * 1024 * 1024
  if (parsed.buffer.length > maxBytes) throw new Error(`Rasm hajmi ${config.limits.imageMb} MB dan kichik bo'lishi kerak`)
  if (parsed.buffer.length < 16) throw new Error('Rasm bo\'sh')
  // SVG ichida script bo'lishi mumkin — saqlamaymiz, faqat rasm renderer'lariga ishonamiz
  if (parsed.mime === 'image/svg+xml') {
    const text = parsed.buffer.toString('utf8')
    if (/<script|onload=|onerror=/i.test(text)) throw new Error('SVG ichida script taqiqlangan')
  }
  const name = save(parsed.buffer, imagesDir, MIME_EXT[parsed.mime], `${label}-`)
  return `/media/images/${name}`
}

export function saveProductFile(input, originalName = 'file') {
  const parsed = parseDataUrl(input)
  if (!parsed) throw new Error('Fayl formati noto\'g\'ri')
  const ext = PRODUCT_MIME_EXT[parsed.mime]
  if (!ext) throw new Error('Faqat ZIP, PDF, TXT va JSON fayllari qabul qilinadi')
  const maxBytes = config.limits.productFileMb * 1024 * 1024
  if (parsed.buffer.length > maxBytes) throw new Error(`Fayl hajmi ${config.limits.productFileMb} MB dan kichik bo'lishi kerak`)
  const safe = path.basename(String(originalName)).replace(/[^\w.-]/g, '_').slice(-40)
  const name = save(parsed.buffer, filesDir, ext, `${uid()}-${safe}-`)
  return `/api/admin/files/${name}`
}

export function saveReceiptPdf(buffer) {
  const name = save(buffer, receiptsDir, 'pdf', 'receipt-')
  return path.join(receiptsDir, name)
}

export function mediaPath(relative) {
  const value = String(relative || '')
  const match = /^\/media\/(images|files)\/([A-Za-z0-9_.-]+)$/.exec(value)
  if (!match) return null
  const dir = match[1] === 'images' ? imagesDir : filesDir
  const target = path.join(dir, match[2])
  if (!target.startsWith(dir + path.sep)) return null
  return fs.existsSync(target) ? target : null
}

export function privateFilePath(storedPath) {
  const name = path.basename(String(storedPath || ''))
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) return null
  const target = path.join(filesDir, name)
  return fs.existsSync(target) ? target : null
}

export function receiptPath(storedPath) {
  const name = path.basename(String(storedPath || ''))
  if (!/^receipt-[A-Za-z0-9_.-]+\.pdf$/.test(name)) return null
  const target = path.join(receiptsDir, name)
  return fs.existsSync(target) ? target : null
}

export function fileChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}
