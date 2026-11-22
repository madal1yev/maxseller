import {
  ArrowUpRight, Bot, CalendarDays, CheckCircle2, CircleDollarSign, Clock3,
  LoaderCircle, Package, Plus, ShoppingCart, Users, Wallet,
} from 'lucide-react'
import { money } from '../shared/api'
import type { Stats } from '../shared/types'

interface Props {
  stats: Stats
  onAdd: () => void
  onProducts: () => void
  onOrders: () => void
  onPayments: () => void
  onBots: () => void
}

export default function Dashboard({ stats, onAdd, onProducts, onOrders, onPayments, onBots }: Props) {
  const cards = [
    { label: 'Jami buyurtmalar', value: stats.total, icon: ShoppingCart, tone: '' },
    { label: 'Bugungi buyurtmalar', value: stats.today, icon: CalendarDays, tone: '' },
    { label: 'Yangi / tasdiq kutilmoqda', value: stats.new, icon: Clock3, tone: 'warn' },
    { label: 'Ish jarayonida', value: stats.inProgress, icon: LoaderCircle, tone: '' },
    { label: 'Bajarildi', value: stats.completed, icon: CheckCircle2, tone: 'alt' },
    { label: 'To\'lov kutilmoqda', value: stats.unpaid, icon: Wallet, tone: 'warn' },
    { label: 'Tekshiruvdagi to\'lovlar', value: stats.paymentsPending, icon: CircleDollarSign, tone: 'warn' },
    { label: 'Mijozlar', value: stats.customers, icon: Users, tone: 'alt' },
  ]

  return (
    <>
      <div className="stat-grid admin-stats">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div className={`stat ${tone}`} key={label}>
            <div><div className="label">{label}</div><div className="value">{value}</div></div>
            <div className="ico"><Icon size={18} /></div>
          </div>
        ))}
      </div>

      <div className="revenue-strip">
        <div><span>Tasdiqlangan daromad</span><strong>{money(stats.revenue)} so'm</strong></div>
        <div><span>Faol mahsulotlar</span><strong>{stats.products}</strong></div>
        <div><span>Bekor qilingan</span><strong>{stats.cancelled}</strong></div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><h2>Eng ko'p buyurtma qilingan mahsulotlar</h2><p>Haqiqiy buyurtmalar bo'yicha</p></div>
          <button className="btn btn-ghost btn-sm" onClick={onProducts}>Mahsulotlar <ArrowUpRight size={15} /></button>
        </div>
        <div className="top-list">
          {stats.topProducts.map((item, i) => (
            <div className="top-item" key={item.title}>
              <span className="rank">{i + 1}</span>
              <b>{item.title}</b>
              <span className="badge on">{item.count} buyurtma</span>
            </div>
          ))}
          {stats.topProducts.length === 0 && <p className="muted">Hali buyurtma yo'q</p>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h2>Tezkor harakatlar</h2><p>Eng ko'p ishlatiladigan bo'limlar</p></div></div>
        <div className="quick-actions">
          <button className="btn btn-sm" onClick={onOrders}><ShoppingCart size={16} /> Buyurtmalar</button>
          <button className="btn btn-ghost btn-sm" onClick={onPayments}><Wallet size={16} /> To'lovlarni tekshirish {stats.paymentsPending > 0 && <span className="count-pill">{stats.paymentsPending}</span>}</button>
          <button className="btn btn-ghost btn-sm" onClick={onAdd}><Plus size={16} /> Yangi mahsulot</button>
          <button className="btn btn-ghost btn-sm" onClick={onBots}><Bot size={16} /> Telegram botlar</button>
          <button className="btn btn-ghost btn-sm" onClick={onProducts}><Package size={16} /> Katalog</button>
        </div>
      </div>
    </>
  )
}
