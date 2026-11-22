import { useCallback, useEffect, useState } from 'react'
import { Eye, PackageSearch, RefreshCw, Search } from 'lucide-react'
import { api, date, money } from '../shared/api'
import type { Order } from '../shared/types'
import { EmptyState, ErrorBox, Loading } from '../store/ui'
import OrderDetail from './OrderDetail'

interface Props {
  onChanged: () => Promise<void>
  notify: (message: string) => void
}

export default function Orders({ onChanged, notify }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([])
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.adminOrders({ q, status })
      setOrders(result.orders)
      setStatuses(result.statuses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Buyurtmalar yuklanmadi')
    } finally {
      setLoading(false)
    }
  }, [q, status])

  useEffect(() => { void load() }, [load])

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div><h2>Buyurtmalar</h2><p>Barcha veb va bot buyurtmalari bitta ro'yxatda</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={15} /> Yangilash</button>
        </div>
        <div className="toolbar">
          <label className="search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buyurtma raqami, ism yoki telefon" /></label>
          <select className="select status-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Barcha holatlar</option>
            {statuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        {error && <ErrorBox message={error} onRetry={() => void load()} />}
        {loading ? <Loading /> : orders.length === 0 ? (
          <EmptyState title="Buyurtma topilmadi" text="Filterlarni o'zgartiring yoki yangi buyurtma kuting." icon={<PackageSearch />} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Buyurtma</th><th>Mijoz</th><th>Sana</th><th>Turi</th><th>Summa</th><th>To'lov</th><th></th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="cell-title" data-label="Buyurtma">#{order.orderNumber}</td>
                    <td data-label="Mijoz"><div className="cell-title">{order.customer.name}</div><div className="cell-sub">{order.customer.phone}</div></td>
                    <td className="muted nowrap" data-label="Sana">{date(order.createdAt)}</td>
                    <td data-label="Turi"><span className="badge cat">{order.type === 'custom' ? 'Loyiha' : 'Mahsulot'}</span></td>
                    <td className="nowrap" data-label="Summa"><b>{money(order.total)}</b></td>
                    <td data-label="To'lov"><span className={`badge ${order.paymentStatus === 'PAID' ? 'on' : order.paymentStatus === 'REVIEW' ? 'warn-badge' : 'off'}`}>{order.paymentStatus}</span></td>
                    <td data-label="Harakat"><button className="icon-btn" title="Ochish" onClick={() => setSelected(order.id)}><Eye size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <OrderDetail id={selected} onClose={() => setSelected(null)} onChanged={async () => { await onChanged(); await load() }} notify={notify} />
      )}
    </>
  )
}
