import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, getUserToken, setUserToken as saveUserToken } from '../shared/api'
import { useI18n } from '../shared/i18n'
import type { Bootstrap, CategoryId, Product, Settings, User } from '../shared/types'
import Auth from './Auth'
import Cabinet from './Cabinet'
import Checkout from './Checkout'
import { loadCart, saveCart, type CartItem } from './cart'
import Catalog from './Catalog'
import OrderPage from './OrderPage'
import ProductPage from './ProductPage'
import { consumeIntended, currentPath, go, parseHash, rememberIntended, type Route } from './router'
import { CategoryStrip, Features, Faq, Final, Footer, Hero, Nav, Steps } from './sections'
import Success from './Success'
import Track from './Track'
import { Loading, Toast } from './ui'

const DEFAULT_SETTINGS: Settings = {
  telegramChannel: 'maxseller_uz',
  instagram: 'maxseller_uz',
  currency: 'so\'m',
  heroAccent: 'bir joyda!',
  heroLead: 'Veb-saytlar, dizayn shablonlar, ilmiy ishlar va video darsliklar.',
  catalogText: 'Barcha mahsulotlar tayyor fayl ko\'rinishida beriladi.',
  finalTitle: 'Kanalga qo\'shiling',
  finalText: 'Yangi mahsulotlar va chegirmalar birinchi bo\'lib Telegram kanalda e\'lon qilinadi.',
}

function normalizeCart(items?: CartItem[]): CartItem[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((item) => item && typeof item.productId === 'string')
    .map((item) => ({ productId: item.productId, quantity: Math.max(1, Math.min(100, Number(item.quantity) || 1)) }))
}

export default function App() {
  const { t } = useI18n()
  const [data, setData] = useState<Bootstrap | null>(null)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)
  const [route, setRoute] = useState<Route>({ page: 'home' })
  const [cat, setCat] = useState<'all' | CategoryId>('all')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<CartItem[]>(() => loadCart())
  const [userToken, setUserToken] = useState<string | null>(() => getUserToken())
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(() => Boolean(getUserToken()))
  const [toast, setToast] = useState('')

  const notify = useCallback((message: string) => setToast(message), [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    try {
      const result = await api.bootstrap()
      setData(result)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ui.serverError'))
    }
  }, [t])

  useEffect(() => {
    void load()
    const events = new EventSource('/api/events')
    let poll = 0
    events.addEventListener('hello', () => setLive(true))
    events.addEventListener('update', () => { void load() })
    events.onerror = () => {
      // Serverless platforms cannot stream SSE — fall back to quiet polling.
      setLive(false)
      events.close()
      if (!poll) poll = window.setInterval(() => { void load() }, 15000)
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      events.close()
      if (poll) window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  // Server cart wins when a session is restored; localStorage is only an offline mirror.
  useEffect(() => {
    if (!userToken) { setUser(null); setAuthLoading(false); return }
    let cancelled = false
    setAuthLoading(true)
    api.me()
      .then(async (meResult) => {
        if (cancelled) return
        setUser(meResult.user)
        try {
          const cartResult = await api.getCart()
          if (cancelled) return
          const canonical = normalizeCart(cartResult.items)
          setCart(canonical)
          saveCart(canonical)
        } catch {
          // Keep the offline mirror if the cart endpoint is temporarily unavailable.
        }
      })
      .catch(() => {
        if (cancelled) return
        saveUserToken(null)
        setUserToken(null)
        setUser(null)
      })
      .finally(() => { if (!cancelled) setAuthLoading(false) })
    return () => { cancelled = true }
  }, [userToken])

  useEffect(() => {
    const applyHash = () => {
      const next = parseHash()
      setRoute(next)
      requestAnimationFrame(() => {
        if (next.page === 'home' && next.anchor) {
          document.getElementById(next.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (next.page !== 'home') {
          window.scrollTo({ top: 0, behavior: 'auto' })
        } else if (!next.anchor) {
          window.scrollTo({ top: 0, behavior: 'auto' })
        }
      })
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  // Checkout requires auth: remember the exact path (including ?mode=custom) before login.
  useEffect(() => {
    if (authLoading || user || route.page !== 'checkout') return
    rememberIntended(currentPath())
    go('/login')
  }, [route, user, authLoading])

  const syncServerCart = useCallback((items: CartItem[]) => {
    if (getUserToken()) void api.putCart(items).catch(() => undefined)
  }, [])

  const applyCart = useCallback((next: CartItem[]) => {
    setCart(next)
    saveCart(next)
    syncServerCart(next)
  }, [syncServerCart])

  const addToCart = useCallback((product: Product, buyNow = false) => {
    setCart((prev) => {
      const found = prev.find((item) => item.productId === product.id)
      const next = found
        ? prev.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(100, item.quantity + 1) } : item)
        : [...prev, { productId: product.id, quantity: 1 }]
      saveCart(next)
      syncServerCart(next)
      return next
    })
    notify(t('ui.added', { title: product.title }))
    if (buyNow) go('/checkout')
  }, [notify, syncServerCart, t])

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) { applyCart(cart.filter((item) => item.productId !== productId)); return }
    applyCart(cart.map((item) => item.productId === productId ? { ...item, quantity: Math.min(100, quantity) } : item))
  }

  const onAuthenticated = useCallback((token: string, nextUser: User, serverCart?: CartItem[]) => {
    saveUserToken(token)
    setUserToken(token)
    setUser(nextUser)
    if (serverCart) {
      const canonical = normalizeCart(serverCart)
      setCart(canonical)
      saveCart(canonical)
    }
    const intended = consumeIntended()
    go(intended || '/cabinet')
  }, [])

  const logout = () => {
    void api.logout().catch(() => undefined)
    saveUserToken(null)
    setUserToken(null)
    setUser(null)
    notify(t('ui.logout'))
  }

  const goCategory = (next: CategoryId) => {
    setCat(next)
    go('/catalog')
    document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const settings = data?.settings ?? DEFAULT_SETTINGS
  const methods = data?.paymentMethods ?? []
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  const renderPage = () => {
    switch (route.page) {
      case 'product':
        return <ProductPage product={data?.products.find((p) => p.id === route.id)} settings={settings} loading={!data} onAdd={addToCart} />
      case 'checkout':
        return !user ? <div className="store-page"><Loading text={t('auth.checking')} /></div> : (
          <Checkout
            mode={route.mode}
            products={data?.products ?? []}
            settings={settings}
            methods={methods}
            cart={cart}
            user={user}
            loading={!data}
            setQuantity={setQuantity}
            removeItem={(id) => applyCart(cart.filter((item) => item.productId !== id))}
            onClearCart={() => applyCart([])}
            onCreated={() => undefined}
            notify={notify}
          />
        )
      case 'success':
        return <Success id={route.id} />
      case 'order':
        return <OrderPage id={route.id} user={user} notify={notify} />
      case 'track':
        return <Track />
      case 'auth':
        return <Auth mode={route.mode} token={route.token} onAuthenticated={onAuthenticated} notify={notify} />
      case 'cabinet':
        if (authLoading) return <div className="store-page"><Loading text={t('common.loading')} /></div>
        return user ? (
          <Cabinet user={user} tab={route.tab} onLogout={logout} onUser={setUser} notify={notify} />
        ) : (
          <Auth mode="login" onAuthenticated={onAuthenticated} notify={notify} />
        )
      default:
        return (
          <>
            <Hero settings={settings} />
            <CategoryStrip onCategory={goCategory} />
            <Catalog
              products={data?.products ?? []}
              settings={settings}
              cat={cat}
              q={q}
              loading={!data}
              onCat={setCat}
              onQ={setQ}
              onAdd={addToCart}
            />
            <Features />
            <Steps />
            <Faq />
            <Final settings={settings} />
          </>
        )
    }
  }

  return (
    <>
      {error && (
        <div className="global-error">
          {error} — {t('ui.checkServer')} (<code>npm run dev</code>).
          <button onClick={() => void load()}>{t('common.retry')}</button>
        </div>
      )}
      <Nav settings={settings} user={user} cartCount={cartCount} onCategory={goCategory} onLogout={logout} />
      <main>{renderPage()}</main>
      <Footer live={live} />
      <Toast message={toast} />
    </>
  )
}
