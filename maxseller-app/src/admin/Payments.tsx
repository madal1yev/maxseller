import { useCallback, useEffect, useState } from 'react'
import { Check, Eye, Receipt, RefreshCw, X } from 'lucide-react'
import { api, date, money, openBlob } from '../shared/api'
import type { Payment } from '../shared/types'
import { EmptyState, ErrorBox, Loading, PaymentBadge } from '../store/ui'
import OrderDetail from './OrderDetail'

interface Props {
  onChanged: () => Promise<void>
  notify: (message: string) => void
}

export default function Payments({ onChanged, notify }: Props) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filter, setFilter] = useState('')
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [decision, setDecision] = useState<{ id: string; approve: boolean } | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.adminPayments(filter)
      setPayments(result.payments)
      setLabels(result.labels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'To\'lovlar yuklanmadi')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let cancelled = false
    const urls: string[] = []
    const withReceipt = payments.filter((p) => p.hasReceipt)
    void (async () => {
      const next: Record<string, string> = {}
      for (const payment of withReceipt) {
        try {
          const blob = await api.paymentReceipt(payment.id)
          const url = URL.createObjectURL(blob)
          urls.push(url)
          next[payment.id] = url
        } catch { /* preview ixtiyoriy */ }
      }
      if (!cancelled) setPreviews(next)
      else urls.forEach((url) => URL.revokeObjectURL(url))
    })()
    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [payments])

  const verify = async () => {
    if (!decision) return
    try {
      await api.verifyPayment(decision.id, decision.approve, reason)
      notify(decision.approve ? 'To\'lov tasdiqlandi' : 'To\'lov rad etildi')
      setDecision(null)
      setReason('')
      await load()
      await onChanged()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Amal bajarilmadi')
    }
  }

  const full = async (id: string) => {
    try { openBlob(await api.paymentReceipt(id)) }
    catch (err) { notify(err instanceof Error ? err.message : 'Chek ochilmadi') }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div><h2>To'lovlar</h2><p>Faqat backend tomonidan tasdiqlanadi. Chek rasmi va tranzaksiya ma'lumoti tekshiriladi.</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={15} /> Yangilash</button>
        </div>
        <div className="toolbar">
          {['', 'REVIEW', 'PAID', 'FAILED', 'UNPAID'].map((item) => (
            <button key={item} className="tab" aria-selected={filter === item} onClick={() => setFilter(item)}>
              {item ? labels[item] || item : 'Barchasi'}
            </button>
          ))}
        </div>
        {error && <ErrorBox message={error} onRetry={() => void load()} />}
        {loading ? <Loading /> : payments.length === 0 ? (
          <EmptyState title="To'lov yo'q" text="Mijoz chek yuborganda shu yerda paydo bo'ladi." icon={<Receipt />} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Buyurtma</th><th>Sana</th><th>Usul</th><th>Summa</th><th>Chek</th><th>Holat</th><th>Harakatlar</th></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="cell-title" data-label="Buyurtma">#{payment.orderNumber || '—'}</td>
                    <td className="muted nowrap" data-label="Sana">{date(payment.createdAt)}</td>
                    <td data-label="Usul">{payment.method}</td>
                    <td className="nowrap" data-label="Summa"><b>{money(payment.amount)}</b></td>
                    <td data-label="Chek">
                      {payment.hasReceipt ? (
                        <button className="receipt-thumb" onClick={() => void full(payment.id)} title="Chekni kattalashtirish">
                          {previews[payment.id] ? <img src={previews[payment.id]} alt="To'lov cheki" /> : <Receipt size={18} />}
                        </button>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td data-label="Holat"><PaymentBadge status={payment.status} /></td>
                    <td data-label="Harakatlar">
                      <div className="row-actions">
                        <button className="icon-btn" title="Buyurtmani ochish" onClick={() => setSelectedOrder(payment.orderId)}><Eye size={15} /></button>
                        {payment.status === 'REVIEW' && (
                          <>
                            <button className="icon-btn" title="Tasdiqlash" onClick={() => setDecision({ id: payment.id, approve: true })}><Check size={15} /></button>
                            <button className="icon-btn danger" title="Rad etish" onClick={() => setDecision({ id: payment.id, approve: false })}><X size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {decision && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDecision(null) }}>
          <div className="modal" style={{ width: 'min(440px, 100%)' }}>
            <h2>To'lovni {decision.approve ? 'tasdiqlash' : 'rad etish'}</h2>
            <p className="modal-sub">Bu amal buyurtma holatiga va mijozga yuboriladigan xabarga ta'sir qiladi.</p>
            {!decision.approve && (
              <div className="field"><label htmlFor="pay-reason">Rad sababi</label><textarea id="pay-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Chek aniq emas yoki summa mos kelmadi" /></div>
            )}
            <div className="modal-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => setDecision(null)}>Bekor qilish</button>
              <button className={`btn btn-sm${decision.approve ? '' : ' btn-danger'}`} onClick={() => void verify()}>{decision.approve ? 'Tasdiqlash' : 'Rad etish'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetail id={selectedOrder} onClose={() => setSelectedOrder(null)} onChanged={async () => { await onChanged(); await load() }} notify={notify} />
      )}
    </>
  )
}
