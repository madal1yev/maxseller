import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck, RefreshCw, Search, Users } from 'lucide-react'
import { api, date, describeApiError, money } from '../shared/api'
import type { AccountStatus, CustomerDetail, CustomerSummary } from '../shared/types'
import { EmptyState, ErrorBox, Loading, StatusBadge } from '../store/ui'

const STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Faol',
  suspended: 'Vaqtinchalik to‘xtatilgan',
  blocked: 'Bloklangan',
}

export default function Customers({ notify }: { notify: (message: string) => void }) {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<CustomerDetail | null>(null)
  const [status, setStatus] = useState<AccountStatus>('active')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.adminCustomers()
      setCustomers(result.customers)
    } catch (err) {
      setError(describeApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const open = async (id: string) => {
    setDetailLoading(true)
    try {
      const detail = await api.adminCustomerDetail(id)
      setSelected(detail)
      setStatus(detail.customer.accountStatus || 'active')
      setReason('')
    } catch (err) {
      notify(describeApiError(err))
    } finally {
      setDetailLoading(false)
    }
  }

  const changeStatus = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      await api.setCustomerStatus(selected.customer.id, status, reason.trim() || undefined)
      const detail = await api.adminCustomerDetail(selected.customer.id)
      setSelected(detail)
      setStatus(detail.customer.accountStatus || 'active')
      setReason('')
      setCustomers((prev) => prev.map((item) => item.id === detail.customer.id ? { ...item, accountStatus: detail.customer.accountStatus } : item))
      notify('Mijoz holati yangilandi')
    } catch (err) {
      notify(describeApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const list = customers.filter((item) => {
    const query = q.trim().toLocaleLowerCase('uz')
    return !query || [
      item.name, item.phone, item.email || '', item.customerNumber || '',
      item.telegramUsername || '',
    ].join(' ').toLocaleLowerCase('uz').includes(query)
  })

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div><h2>Mijozlar</h2><p>Ro'yxatdan o'tgan mijozlar, tasdiqlanish holati va buyurtma statistikasi</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={15} /> Yangilash</button>
        </div>
        <div className="toolbar"><label className="search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, ID, telefon yoki email bo'yicha qidirish" /></label></div>
        {error && <ErrorBox message={error} onRetry={() => void load()} />}
        {loading ? <Loading /> : list.length === 0 ? (
          <EmptyState title="Mijoz topilmadi" text="Mijoz ro'yxatdan o'tganda shu yerda paydo bo'ladi." icon={<Users />} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Mijoz</th><th>Email / telefon</th><th>Tasdiqlanish</th><th>Holat</th>
                <th>Buyurtmalar</th><th>Sarflangan</th><th>Oxirgi buyurtma</th><th>Qo'shilgan</th><th>Oxirgi kirish</th><th></th>
              </tr></thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-title" data-label="Mijoz">{item.name}<div className="cell-sub">{item.customerNumber || 'ID yo\'q'}</div></td>
                    <td data-label="Email / telefon">{item.email || <span className="muted">email yo'q</span>}<div className="cell-sub">{item.phone}</div></td>
                    <td data-label="Tasdiqlanish"><div className="verify-badges">
                      <span className={`badge ${item.phoneVerified ? 'on' : 'off'}`} title="Telefon">{item.phoneVerified ? <><BadgeCheck size={12} /> Tel</> : 'Tel ✗'}</span>
                      <span className={`badge ${item.emailVerified ? 'on' : 'off'}`} title="Email">{item.emailVerified ? <><BadgeCheck size={12} /> Email</> : 'Email ✗'}</span>
                    </div></td>
                    <td data-label="Holat"><span className={`badge ${(item.accountStatus || 'active') === 'active' ? 'on' : (item.accountStatus === 'suspended') ? 'warn-badge' : 'off'}`}>{STATUS_LABELS[item.accountStatus || 'active']}</span></td>
                    <td data-label="Buyurtmalar"><b>{item.orderCount}</b></td>
                    <td className="nowrap" data-label="Sarflangan"><b>{money(item.totalSpent)}</b></td>
                    <td className="muted nowrap" data-label="Oxirgi buyurtma">{date(item.lastOrder?.createdAt || item.lastOrderAt || '')}</td>
                    <td className="muted nowrap" data-label="Qo'shilgan">{date(item.createdAt)}</td>
                    <td className="muted nowrap" data-label="Oxirgi kirish">{date(item.lastLoginAt || '')}</td>
                    <td data-label="Harakat"><button className="btn btn-ghost btn-sm" onClick={() => void open(item.id)}>Ochish</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailLoading && !selected && <Loading text="Mijoz yuklanmoqda..." />}

      {selected && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="modal order-modal">
            <div className="modal-head-row">
              <div>
                <h2>{selected.customer.name}</h2>
                <p className="modal-sub">{selected.customer.customerNumber || selected.customer.id} · {selected.customer.phone} · {selected.customer.email || 'email yo\'q'}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Yopish</button>
            </div>

            <div className="account-facts">
              <div><span>Hisob holati</span><b>{STATUS_LABELS[selected.customer.accountStatus || 'active']}</b></div>
              <div><span>Telefon</span><b>{selected.customer.phoneVerified ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}</b></div>
              <div><span>Email</span><b>{selected.customer.emailVerified ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}</b></div>
              <div><span>Qo'shilgan</span><b>{date(selected.customer.createdAt)}</b></div>
              <div><span>Oxirgi kirish</span><b>{date(selected.customer.lastLoginAt || '')}</b></div>
              <div><span>Buyurtmalar</span><b>{selected.orders.length}</b></div>
            </div>

            <form className="status-control" onSubmit={changeStatus}>
              <div className="field">
                <label htmlFor="cust-status">Hisob holatini o'zgartirish</label>
                <select id="cust-status" className="select" value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
                  {(Object.keys(STATUS_LABELS) as AccountStatus[]).map((key) => <option key={key} value={key}>{STATUS_LABELS[key]}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cust-reason">Sabab (ixtiyoriy)</label>
                <input id="cust-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masalan: to'lov qoidalarini buzish" />
              </div>
              <button className="btn btn-sm" type="submit" disabled={saving || status === (selected.customer.accountStatus || 'active')}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            </form>

            <div className="detail-columns">
              <div>
                <h3>Buyurtmalar</h3>
                {selected.orders.map((order) => (
                  <div className="mini-line" key={order.id}>
                    <span>#{order.orderNumber} · {date(order.createdAt)}</span>
                    <b>{money(order.total)}</b>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
                {selected.orders.length === 0 && <p className="muted">Buyurtma yo'q</p>}

                <h3>To'lovlar</h3>
                {selected.payments.map((payment) => (
                  <div className="mini-line" key={payment.id}>
                    <span>{payment.method} · {date(payment.createdAt)}</span>
                    <b>{money(payment.amount)}</b>
                    <span className="muted">{payment.status}</span>
                  </div>
                ))}
                {selected.payments.length === 0 && <p className="muted">To'lov yo'q</p>}
              </div>
              <div>
                <h3>Xaridlar</h3>
                {(selected.purchases || []).map((item) => (
                  <div className="mini-line" key={item.id}>
                    <span>{item.title || item.productTitle || item.productId}</span>
                    <b>{money(item.total ?? item.price ?? 0)}</b>
                  </div>
                ))}
                {!selected.purchases?.length && <p className="muted">Xarid yo'q</p>}

                <h3>Hujjatlar</h3>
                {(selected.receipts || []).map((item) => (
                  <div className="mini-line" key={item.id}>
                    <span>{item.number} · {date(item.createdAt)}</span>
                    <b>{money(item.total)}</b>
                  </div>
                ))}
                {!selected.receipts?.length && <p className="muted">Hujjat yo'q</p>}

                <h3>Faoliyat</h3>
                {(selected.activity || []).map((item) => (
                  <div className="mini-line" key={item.id}>
                    <span>{item.action} · {date(item.at)}</span>
                  </div>
                ))}
                {!selected.activity?.length && <p className="muted">Faoliyat yo'q</p>}
              </div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Yopish</button></div>
          </div>
        </div>
      )}
    </>
  )
}
