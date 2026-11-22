import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Check, Download, FileCheck2, FileText, Paperclip, Save, X } from 'lucide-react'
import { api, date, downloadBlob, fileToDataUrl, money } from '../shared/api'
import { STATUS_LABELS, type OrderDetail as Detail } from '../shared/types'
import { Loading, PaymentBadge, StatusBadge } from '../store/ui'

interface Props {
  id: string
  onClose: () => void
  onChanged: () => Promise<void>
  notify: (message: string) => void
}

export default function OrderDetail({ id, onClose, onChanged, notify }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('')
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [attachName, setAttachName] = useState('')

  const load = useCallback(async () => {
    try { setDetail(await api.adminOrderDetail(id)) }
    catch (err) { notify(err instanceof Error ? err.message : 'Buyurtma yuklanmadi') }
  }, [id, notify])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!detail) return
    setStatus(detail.order.status)
    setPrice(String(detail.order.total || ''))
    setDiscount(String(detail.order.discount || ''))
    setDeadline(detail.order.deadline || '')
  }, [detail])

  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try {
      await action()
      await load()
      await onChanged()
      notify(message)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Amal bajarilmadi')
    } finally {
      setBusy(false)
    }
  }

  const attach = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fileData = await fileToDataUrl(file)
      await act(() => api.attachOrderFile(id, fileData, file.name), 'Fayl biriktirildi')
      setAttachName('')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Fayl biriktirilmadi')
    }
  }

  const receipt = async () => {
    setBusy(true)
    try {
      const blob = await api.adminOrderReceipt(id)
      downloadBlob(blob, `${detail?.order.orderNumber || 'order'}.pdf`)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Hujjat yuklanmadi')
    } finally {
      setBusy(false)
    }
  }

  if (!detail) return <div className="modal-backdrop"><div className="modal"><Loading /></div></div>
  const { order, customer, history, payments, receipts, allowedStatuses } = detail

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal order-modal">
        <div className="modal-head-row">
          <div>
            <h2>#{order.orderNumber}</h2>
            <p className="modal-sub">{date(order.createdAt)} · {order.type === 'custom' ? 'Individual loyiha' : 'Tayyor mahsulot'}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish"><X size={18} /></button>
        </div>

        <div className="badge-row">
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
          <span className="badge cat">{order.paymentMethod}</span>
        </div>

        {order.rejectReason && <div className="notice warn-notice">Rad sababi: {order.rejectReason}</div>}

        <div className="detail-columns">
          <div>
            <h3>Mijoz</h3>
            <div className="detail-list">
              <div><span>Ism</span><b>{customer?.name || order.customer.name}</b></div>
              <div><span>Telefon</span><b>{customer?.phone || order.customer.phone}</b></div>
              <div><span>Telegram</span><b>{order.customer.telegramUsername ? `@${order.customer.telegramUsername}` : '—'}</b></div>
              <div><span>Izoh</span><b>{order.customer.notes || '—'}</b></div>
            </div>
            <h3>Mahsulotlar</h3>
            {order.items.length ? (
              <div className="detail-items">
                {order.items.map((item, i) => (
                  <div key={`${item.productId}-${i}`}><span>{item.title} × {item.quantity}</span><b>{money(item.price * item.quantity)}</b></div>
                ))}
              </div>
            ) : (
              <div className="detail-list">
                <div><span>Loyiha turi</span><b>{order.projectType || '—'}</b></div>
                <div><span>Talablar</span><b>{order.requirements || '—'}</b></div>
              </div>
            )}
            <div className="detail-total"><span>Jami</span><strong>{money(order.total)} so'm</strong></div>
          </div>
          <div>
            <h3>Holatni o'zgartirish</h3>
            <div className="inline-form">
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value={order.status}>{STATUS_LABELS[order.status]} (hozirgi)</option>
                {(allowedStatuses || []).map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
              </select>
              <button className="btn btn-sm" disabled={busy || status === order.status} onClick={() => void act(() => api.setOrderStatus(id, status), 'Holat yangilandi')}><Check size={15} /> Saqlash</button>
            </div>
            <div className="inline-form">
              <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sabab / izoh" />
              <button className="btn btn-ghost btn-sm" disabled={busy || !reason.trim()} onClick={() => void act(() => api.rejectOrder(id, reason), 'Buyurtma rad etildi')}>Rad etish</button>
            </div>
            <div className="inline-form">
              <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Summa" />
              <input className="input" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Chegirma" />
            </div>
            <div className="inline-form">
              <input className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Muddat (masalan: 3 kun)" />
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act(() => api.setOrderPrice(id, { total: Number(price), discount: Number(discount), deadline }), 'Narx saqlandi')}><Save size={15} /></button>
            </div>
            <div className="inline-form">
              <label className="upload-mini">
                <Paperclip size={15} /> {attachName || 'Fayl biriktirish'}
                <input type="file" hidden onChange={(e) => { setAttachName(e.target.files?.[0]?.name || ''); void attach(e) }} />
              </label>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act(() => api.confirmOrder(id), 'Buyurtma tasdiqlandi')}>Tasdiqlash</button>
            </div>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void receipt()}><FileText size={15} /> Hujjatni yuklash</button>
            <p className="help">PDF — ichki buyurtma hujjati, fiskal chek emas.</p>
          </div>
        </div>

        <div className="detail-columns detail-lower">
          <div>
            <h3>To'lovlar</h3>
            {payments.length === 0 && <p className="muted">To'lov yozuvi yo'q</p>}
            {payments.map((payment) => (
              <div className="mini-line" key={payment.id}>
                <span>{date(payment.createdAt)} · {payment.method}</span>
                <b>{money(payment.amount)}</b>
                <PaymentBadge status={payment.status} />
                {payment.transactionId && <small className="muted">{payment.transactionId}</small>}
              </div>
            ))}
            <h3>Fayllar</h3>
            {(order.files || []).length === 0 && <p className="muted">Fayl biriktirilmagan</p>}
            {(order.files || []).map((file) => (
              <div className="mini-line" key={file.id}><FileCheck2 size={15} /><span>{file.fileName}</span><small className="muted">{date(file.at)}</small></div>
            ))}
          </div>
          <div>
            <h3>Holat tarixi</h3>
            <div className="timeline compact">
              {history.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span />
                  <div><b>{STATUS_LABELS[item.to] || item.to}</b><small>{date(item.at)} · {item.actor}</small>{item.reason && <p>{item.reason}</p>}</div>
                </div>
              ))}
            </div>
            {receipts.length > 0 && <p className="help"><Download size={13} /> {receipts.length} ta hujjat yaratilgan</p>}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /> Yopish</button>
        </div>
      </div>
    </div>
  )
}
