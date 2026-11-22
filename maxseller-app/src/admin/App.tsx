import { useCallback, useEffect, useState } from 'react'
import {
  Bot, ExternalLink, LayoutDashboard, LogOut, Menu, Package, ScrollText,
  Settings2, ShoppingCart, Users, Wallet, X,
} from 'lucide-react'
import { api, getToken, setToken } from '../shared/api'
import type { AdminData, Settings as SettingsType } from '../shared/types'
import { Toast } from '../store/ui'
import Bots from './Bots'
import Customers from './Customers'
import Dashboard from './Dashboard'
import Login from './Login'
import Logs from './Logs'
import Orders from './Orders'
import Payments from './Payments'
import Products from './Products'
import Settings from './Settings'

type Page = 'dashboard' | 'orders' | 'payments' | 'products' | 'customers' | 'logs' | 'bots' | 'settings'

const FALLBACK_SETTINGS: SettingsType = {
  telegramChannel: 'maxseller_uz', instagram: 'maxseller_uz', currency: 'so\'m',
  heroAccent: 'bir joyda!', heroLead: '', catalogText: '', finalTitle: '', finalText: '',
}

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
  { id: 'orders', label: 'Buyurtmalar', icon: ShoppingCart },
  { id: 'payments', label: 'To\'lovlar', icon: Wallet },
  { id: 'products', label: 'Mahsulotlar', icon: Package },
  { id: 'customers', label: 'Mijozlar', icon: Users },
  { id: 'logs', label: 'Harakatlar', icon: ScrollText },
  { id: 'bots', label: 'Telegram botlar', icon: Bot },
  { id: 'settings', label: 'Sozlamalar', icon: Settings2 },
]

const PAGE_IDS: Page[] = NAV.map((item) => item.id)

function pageFromHash(): Page {
  const raw = window.location.hash.replace(/^#/, '') as Page
  return PAGE_IDS.includes(raw) ? raw : 'dashboard'
}

const TITLES: Record<Page, { title: string; sub: string }> = {
  dashboard: { title: 'Bosh sahifa', sub: 'Do\'kon va buyurtmalar holati qisqacha ko\'rinishi' },
  orders: { title: 'Buyurtmalar', sub: 'Barcha buyurtmalarni boshqaring' },
  payments: { title: 'To\'lovlar', sub: 'Cheklarni tekshiring va tasdiqlang' },
  products: { title: 'Mahsulotlar', sub: 'Katalog, rasmlar va fayllar' },
  customers: { title: 'Mijozlar', sub: 'Ro\'yxatdan o\'tgan foydalanuvchilar' },
  logs: { title: 'Harakatlar va xabarnomalar', sub: 'Barcha o\'zgarishlar va bot xabarlari tarixi' },
  bots: { title: 'Telegram botlar', sub: 'Xabarnoma va yordam botlari — buyurtmalar veb-saytda qabul qilinadi' },
  settings: { title: 'Sozlamalar', sub: 'Havolalar, matnlar va parol' },
}

export default function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [data, setData] = useState<AdminData | null>(null)
  const [page, setPage] = useState<Page>(pageFromHash)
  const [addSignal, setAddSignal] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)

  const notify = useCallback((message: string) => setToast(message), [])

  useEffect(() => {
    const sync = () => setPage(pageFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const refresh = useCallback(async () => {
    const result = await api.adminData()
    setData(result)
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    refresh()
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof Error && 'status' in err && (err as Error & { status?: number }).status === 401) {
          setToken(null)
          setTokenState(null)
          setData(null)
        } else {
          notify(err instanceof Error ? err.message : 'Ma\'lumotlar yuklanmadi')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, refresh, notify])

  useEffect(() => {
    if (!token) return
    const events = new EventSource('/api/events')
    const reload = () => { void refresh().catch(() => undefined) }
    let poll = 0
    events.addEventListener('orders', reload)
    events.addEventListener('products', reload)
    events.addEventListener('update', reload)
    events.onerror = () => {
      // Vercel functions cannot stream SSE — poll quietly instead.
      events.close()
      if (!poll) poll = window.setInterval(reload, 15000)
    }
    return () => {
      events.close()
      if (poll) window.clearInterval(poll)
    }
  }, [token, refresh])

  const login = async (password: string) => {
    const result = await api.login(password)
    setToken(result.token)
    setTokenState(result.token)
  }

  const logout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    setToken(null)
    setTokenState(null)
    setData(null)
    setPage('dashboard')
    setMoreOpen(false)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  const changePage = (id: Page) => {
    setPage(id)
    setMoreOpen(false)
    if (window.location.hash !== `#${id}`) window.location.hash = id
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!token) {
    return (
      <>
        <Login onLogin={login} />
        <Toast message={toast} />
      </>
    )
  }

  const settings = data?.settings ?? FALLBACK_SETTINGS
  const onChanged = async () => { await refresh() }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="brand" href="/" target="_blank" rel="noopener noreferrer">
          <img src="/favicon.svg" alt="" width={32} height={32} />
          <span>Max<b>Seller</b></span>
        </a>
        <nav className="side-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`side-link${page === id ? ' active' : ''}`} onClick={() => changePage(id)}>
              <Icon size={18} /> {label}
              {id === 'payments' && Boolean(data?.stats.paymentsPending) && <span className="nav-badge">{data?.stats.paymentsPending}</span>}
            </button>
          ))}
        </nav>
        <div className="side-sep" />
        <a className="side-link" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={18} /> Do'konni ochish</a>
        <div className="side-foot">
          <span className="live-dot" />Do'kon bilan jonli bog'lanish.<br />
          O'zgartirishlar avtomatik tarqaladi.
        </div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div>
            <h1>{TITLES[page].title}</h1>
            <p>{TITLES[page].sub}</p>
          </div>
          <div className="top-actions">
            <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Saytni ko'rish</a>
            <button className="btn btn-ghost btn-sm" onClick={() => void logout()}><LogOut size={15} /> Chiqish</button>
          </div>
        </header>

        <main className="content">
          {loading && !data ? (
            <div className="empty-state"><p>Ma'lumotlar yuklanmoqda...</p></div>
          ) : page === 'dashboard' ? (
            <Dashboard
              stats={data?.stats ?? { total: 0, today: 0, new: 0, inProgress: 0, completed: 0, cancelled: 0, unpaid: 0, revenue: 0, customers: 0, products: 0, paymentsPending: 0, topProducts: [] }}
              onAdd={() => { changePage('products'); setAddSignal((n) => n + 1) }}
              onProducts={() => changePage('products')}
              onOrders={() => changePage('orders')}
              onPayments={() => changePage('payments')}
              onBots={() => changePage('bots')}
            />
          ) : page === 'orders' ? (
            <Orders onChanged={onChanged} notify={notify} />
          ) : page === 'payments' ? (
            <Payments onChanged={onChanged} notify={notify} />
          ) : page === 'products' ? (
            <Products products={data?.products ?? []} addSignal={addSignal} onChanged={onChanged} notify={notify} />
          ) : page === 'customers' ? (
            <Customers notify={notify} />
          ) : page === 'logs' ? (
            <Logs notify={notify} />
          ) : page === 'bots' ? (
            <Bots status={data?.telegram ?? null} onRefresh={onChanged} notify={notify} />
          ) : (
            <Settings
              settings={settings}
              onSaved={(next) => setData((prev) => prev ? { ...prev, settings: next } : prev)}
              onBots={() => changePage('bots')}
              notify={notify}
            />
          )}
        </main>
      </div>

      <nav className="mobile-tabs" aria-label="Tez navigatsiya">
        {NAV.slice(0, 5).map(({ id, icon: Icon }) => (
          <button
            key={id}
            className={`mobile-tab${page === id ? ' active' : ''}`}
            onClick={() => changePage(id)}
          >
            <span className="mobile-tab-icon">
              <Icon size={20} />
              {id === 'payments' && Boolean(data?.stats.paymentsPending) && <span className="nav-badge">{data?.stats.paymentsPending}</span>}
            </span>
            <small>{id === 'dashboard' ? 'Bosh' : id === 'orders' ? 'Buyurtma' : id === 'payments' ? 'To\'lov' : id === 'products' ? 'Maxsulot' : 'Mijoz'}</small>
          </button>
        ))}
        <button className={`mobile-tab${NAV.slice(5).some((item) => item.id === page) ? ' active' : ''}`} onClick={() => setMoreOpen(true)}>
          <span className="mobile-tab-icon"><Menu size={20} /></span>
          <small>Ko'proq</small>
        </button>
      </nav>

      {moreOpen && (
        <div className="mobile-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false) }}>
          <aside className="mobile-drawer">
            <div className="mobile-drawer-head">
              <span className="brand"><img src="/favicon.svg" alt="" width={30} height={30} /> <span>Max<b>Seller</b></span></span>
              <button className="icon-btn" aria-label="Yopish" onClick={() => setMoreOpen(false)}><X size={18} /></button>
            </div>
            <div className="mobile-drawer-nav">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button key={id} className={`side-link${page === id ? ' active' : ''}`} onClick={() => changePage(id)}>
                  <Icon size={18} /> {label}
                  {id === 'payments' && Boolean(data?.stats.paymentsPending) && <span className="nav-badge">{data?.stats.paymentsPending}</span>}
                </button>
              ))}
            </div>
            <div className="mobile-drawer-foot">
              <a className="btn btn-ghost" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Do'konni ochish</a>
              <button className="btn btn-danger" onClick={() => void logout()}><LogOut size={16} /> Chiqish</button>
            </div>
          </aside>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
