// Kichik, mustaqil PDF generator (hech qanday tashqi kutubxonasiz).
// Oddiy buyurtma hujjati uchun yetarli: matn, chiziq va to'rtburchaklar.
const PAGE_W = 595
const PAGE_H = 842

function ascii(text) {
  return String(text ?? '')
    .replace(/[\u2018\u2019\u02bc\u02bb]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00d0\u011e\u0130]/g, (m) => ({ '\u00d0': 'D', '\u011e': 'G', '\u0130': 'I' })[m])
    .replace(/[^\x20-\x7e]/g, '')
}

function esc(text) {
  return ascii(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function buildReceiptPdf(doc) {
  const ops = []
  const text = (value, x, y, size = 10, bold = false, color = [0.07, 0.12, 0.09]) => {
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color.join(' ')} rg 1 0 0 1 ${x} ${y} Tm (${esc(value)}) Tj ET`)
  }
  const line = (x1, y1, x2, y2, color = [0.82, 0.87, 0.84], width = 0.7) => {
    ops.push(`${color.join(' ')} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`)
  }
  const rect = (x, y, w, h, color) => {
    ops.push(`${color.join(' ')} rg ${x} ${y} ${w} ${h} re f`)
  }

  const green = [0.05, 0.55, 0.28]
  const muted = [0.40, 0.47, 0.43]

  rect(0, PAGE_H - 96, PAGE_W, 96, [0.03, 0.09, 0.06])
  text('MAXSELLER', 44, PAGE_H - 48, 22, true, [0.13, 0.88, 0.35])
  text('PROFESSIONAL DIGITAL MARKETPLACE', 44, PAGE_H - 68, 8, false, [0.62, 0.72, 0.66])
  text('ORDER DOCUMENT', 420, PAGE_H - 50, 11, true, [0.85, 0.93, 0.88])
  text(String(doc.receiptNumber || ''), 420, PAGE_H - 68, 9, false, [0.62, 0.72, 0.66])

  let y = PAGE_H - 130
  text('Buyurtma hujjati', 44, y, 15, true)
  y -= 22
  text(`Buyurtma raqami: ${doc.orderNumber}`, 44, y, 10)
  text(`Sana: ${doc.date}`, 360, y, 10)
  y -= 16
  text(`Buyurtma turi: ${doc.orderType}`, 44, y, 10)
  text(`Holat: ${doc.status}`, 360, y, 10)

  y -= 28
  rect(44, y - 6, PAGE_W - 88, 22, [0.94, 0.97, 0.95])
  text('MIJOZ MA\'LUMOTLARI', 52, y + 1, 9, true, green)
  y -= 20
  text(`Ism: ${doc.customer.name}`, 52, y, 10)
  text(`Telefon: ${doc.customer.phone}`, 330, y, 10)
  y -= 16
  if (doc.customer.telegramUsername) text(`Telegram: @${doc.customer.telegramUsername}`, 52, y, 10)
  if (doc.customer.notes) text(`Izoh: ${doc.customer.notes.slice(0, 60)}`, 330, y, 9, false, muted)

  y -= 30
  rect(44, y - 6, PAGE_W - 88, 22, [0.94, 0.97, 0.95])
  text('BUYURTMA TARKIBI', 52, y + 1, 9, true, green)
  y -= 16
  line(44, y, PAGE_W - 44, y)
  y -= 16
  text('#', 52, y, 9, true, muted)
  text('Mahsulot', 76, y, 9, true, muted)
  text('Miqdori', 360, y, 9, true, muted)
  text('Narxi', 430, y, 9, true, muted)
  text('Jami', 505, y, 9, true, muted)
  y -= 10
  line(44, y, PAGE_W - 44, y)
  y -= 20

  for (const [index, item] of (doc.items || []).entries()) {
    text(String(index + 1), 52, y, 10)
    text(String(item.title).slice(0, 42), 76, y, 10)
    text(String(item.quantity), 362, y, 10)
    text(String(item.price), 430, y, 10)
    text(String(Number(item.price) * Number(item.quantity)), 505, y, 10)
    y -= 19
    if (y < 220) break
  }
  line(44, y + 8, PAGE_W - 44, y + 8)

  y -= 18
  text('Oraliq summa:', 350, y, 10, false, muted)
  text(String(doc.subtotal), 505, y, 10)
  y -= 16
  if (doc.discount > 0) {
    text('Chegirma:', 350, y, 10, false, muted)
    text(`-${doc.discount}`, 505, y, 10)
    y -= 16
  }
  text('JAMI:', 350, y, 12, true)
  text(String(doc.total), 505, y, 12, true, green)

  y -= 34
  rect(44, y - 6, PAGE_W - 88, 22, [0.94, 0.97, 0.95])
  text('TO\'LOV MA\'LUMOTLARI', 52, y + 1, 9, true, green)
  y -= 20
  text(`To'lov usuli: ${doc.paymentMethod}`, 52, y, 10)
  text(`To'lov holati: ${doc.paymentStatus}`, 330, y, 10)
  y -= 16
  if (doc.transactionId) text(`Tranzaksiya ID: ${doc.transactionId}`, 52, y, 10)
  y -= 16
  text(`Buyurtma holati: ${doc.orderStatus}`, 52, y, 10)

  if (doc.notes) {
    y -= 28
    text(`Izoh: ${doc.notes.slice(0, 110)}`, 52, y, 9, false, muted)
  }

  line(44, 92, PAGE_W - 44, 92)
  text('Bu hujjat buyurtma tasdigi bo\'lib, fiskal chek hisoblanmaydi.', 44, 74, 8, false, muted)
  text('Fiskal chek talab qilinsa, rasmiy fiskal xizmat integratsiyasi orqali beriladi.', 44, 60, 8, false, muted)
  text('MaxSeller - raqamli mahsulotlar va IT xizmatlar marketplace\'i', 44, 40, 8, false, muted)

  const content = ops.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefAt = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
