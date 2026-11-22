import { useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { api, money } from '../shared/api'
import { useI18n } from '../shared/i18n'
import type { PaymentMethod, Product, Settings, User } from '../shared/types'
import type { CartItem } from './cart'
import { go, successPath } from './router'
import { EmptyState, ErrorBox, Loading, PageHead } from './ui'

interface Props {
  mode: 'instant' | 'custom'
  products: Product[]
  settings: Settings
  methods: PaymentMethod[]
  cart: CartItem[]
  user: User | null
  loading: boolean
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  onClearCart: () => void
  onCreated: () => void
  notify: (message: string) => void
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function Checkout({
  mode, products, settings, methods, cart, user, loading, setQuantity,
  removeItem, onClearCart, onCreated, notify,
}: Props) {
  const { t } = useI18n()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [notes, setNotes] = useState('')
  const [projectType, setProjectType] = useState('')
  const [requirements, setRequirements] = useState('')
  const [budget, setBudget] = useState('')
  const [customTotal, setCustomTotal] = useState('')
  const [method, setMethod] = useState('card')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const idempotencyKey = useRef('')

  const items = useMemo(() => cart
    .map((line) => ({ line, product: products.find((p) => p.id === line.productId) }))
    .filter((entry): entry is { line: CartItem; product: Product } => Boolean(entry.product)),
  [cart, products])

  const total = items.reduce((sum, entry) => sum + entry.product.price * entry.line.quantity, 0)
  const payable = mode === 'custom' ? (Number(customTotal) || Number(budget) || 0) : total
  const selectedMethod = methods.find((m) => m.id === method)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (busy) return
    if (!user) { setError(t('checkout.loginRequired')); return }
    if (name.trim().length < 2) { setError(t('auth.enterName')); return }
    if (!/^[+\d][\d\s()-]{6,18}$/.test(phone.trim())) { setError(t('checkout.validPhone')); return }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t('auth.enterEmail')); return }
    if (mode === 'instant' && items.length === 0) { setError(t('checkout.emptyCart')); return }
    if (mode === 'custom' && requirements.trim().length < 10) { setError(t('checkout.shortRequirements')); return }

    // Reuse one key for the whole in-flight request (and retries) to prevent duplicate orders.
    if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey()
    setBusy(true)
    try {
      const result = await api.createOrder({
        idempotencyKey: idempotencyKey.current,
        type: mode,
        customer: { name: name.trim(), phone: phone.trim(), ...(email.trim() ? { email: email.trim() } : {}), notes },
        items: mode === 'instant' ? items.map(({ product, line }) => ({ productId: product.id, quantity: line.quantity })) : [],
        paymentMethod: method,
        ...(mode === 'custom' ? {
          projectType: projectType.trim(),
          requirements: requirements.trim(),
          budget: Number(budget) || 0,
          total: Number(customTotal) || Number(budget) || 0,
        } : {}),
      })
      idempotencyKey.current = ''
      if (mode === 'instant') onClearCart()
      onCreated()
      notify(t('checkout.created'))
      go(successPath(result.order.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.failed'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="store-page"><Loading text={t('checkout.loading')} /></div>

  return (
    <div className="store-page checkout-page">
      <button className="back-link" onClick={() => go('/catalog')}><ArrowLeft size={16} /> {t('common.backToCatalog')}</button>
      <PageHead
        eyebrow={mode === 'custom' ? t('common.custom') : t('checkout.instant')}
        title={mode === 'custom' ? t('checkout.customTitle') : t('checkout.confirmTitle')}
        text={t('checkout.intro')}
      />

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <section className="panel form-panel">
            <h2>{t('checkout.contacts')}</h2>
            <div className="form-grid">
              <div className="field span-2"><label htmlFor="co-name">{t('auth.name')} *</label><input id="co-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth.fullName')} autoComplete="name" required /></div>
              <div className="field"><label htmlFor="co-phone">{t('common.phone')} *</label><input id="co-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+99890 123 45 67" autoComplete="tel" required /></div>
              <div className="field"><label htmlFor="co-email">{t('common.email')}</label><input id="co-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" /></div>
              <div className="field span-2"><label htmlFor="co-notes">{t('checkout.notes')}</label><textarea id="co-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('checkout.notesPlaceholder')} /></div>
            </div>
            {!user && <div className="notice warn-notice">{t('checkout.loginToOrder')} <button type="button" className="link-button" onClick={() => go('/login')}>{t('checkout.loginLink')}</button>.</div>}
          </section>

          {mode === 'custom' ? (
            <section className="panel form-panel">
              <h2>{t('checkout.projectDetails')}</h2>
              <div className="form-grid">
                <div className="field"><label htmlFor="co-type">{t('checkout.projectType')}</label><input id="co-type" className="input" value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder={t('checkout.projectTypePlaceholder')} required /></div>
                <div className="field"><label htmlFor="co-budget">{t('checkout.budget')}</label><input id="co-budget" className="input" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="1000000" /></div>
                <div className="field span-2"><label htmlFor="co-req">{t('checkout.requirements')}</label><textarea id="co-req" className="textarea" style={{ minHeight: 150 }} value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder={t('checkout.requirementsPlaceholder')} required /></div>
                <div className="field span-2"><label htmlFor="co-total">{t('checkout.agreedTotal')}</label><input id="co-total" className="input" type="number" min="0" value={customTotal} onChange={(e) => setCustomTotal(e.target.value)} placeholder={t('checkout.budgetFallback')} /><span className="help">{t('checkout.adminPrice')}</span></div>
              </div>
            </section>
          ) : (
            <section className="panel form-panel">
              <h2>{t('checkout.cartSection')}</h2>
              {items.length === 0 ? (
                <EmptyState title={t('checkout.cartEmpty')} text={t('checkout.cartEmptyText')}>
                  <button type="button" className="btn btn-sm" onClick={() => go('/catalog')}>{t('checkout.toCatalog')}</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('/checkout?mode=custom')}>{t('common.custom')}</button>
                </EmptyState>
              ) : (
                <div className="cart-list">
                  {items.map(({ product, line }) => (
                    <div className="cart-line" key={product.id}>
                      <img src={product.image || '/favicon.svg'} alt="" />
                      <div className="cart-line-info"><b>{product.title}</b><span>{money(product.price)} {settings.currency} {t('checkout.perPiece')}</span></div>
                      <div className="qty">
                        <button type="button" onClick={() => setQuantity(product.id, line.quantity - 1)} disabled={line.quantity <= 1} aria-label={t('checkout.decrease')}><Minus size={14} /></button>
                        <span>{line.quantity}</span>
                        <button type="button" onClick={() => setQuantity(product.id, line.quantity + 1)} aria-label={t('checkout.increase')}><Plus size={14} /></button>
                      </div>
                      <strong className="cart-subtotal">{money(product.price * line.quantity)}</strong>
                      <button type="button" className="icon-btn danger" onClick={() => removeItem(product.id)} aria-label={t('checkout.remove')}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="panel form-panel">
            <h2>{t('checkout.paymentSection')}</h2>
            <div className="method-list">
              {methods.map((item) => (
                <label key={item.id} className={`method-option${method === item.id ? ' selected' : ''}${!item.available ? ' disabled' : ''}`}>
                  <input type="radio" name="payment" value={item.id} checked={method === item.id} onChange={() => setMethod(item.id)} disabled={!item.available} />
                  <span className="radio-dot" />
                  <span><b>{item.name}</b><small>{item.instructions}</small></span>
                </label>
              ))}
              {methods.length === 0 && <p className="muted">{t('checkout.noMethods')}</p>}
            </div>
          </section>

          {error && <ErrorBox message={error} />}

          <button className="btn checkout-submit" type="submit" disabled={busy || !user || (mode === 'instant' && items.length === 0)}>
            <ShieldCheck size={18} /> {busy ? t('checkout.submitting') : t('checkout.submit')}
          </button>
        </form>

        <aside className="summary-card">
          <h2>{t('checkout.summary')}</h2>
          <div className="summary-rows">
            <div><span>{t('checkout.summaryType')}</span><b>{mode === 'custom' ? t('common.custom') : t('common.readyProduct')}</b></div>
            <div><span>{t('checkout.itemCount')}</span><b>{mode === 'custom' ? '—' : items.reduce((s, i) => s + i.line.quantity, 0)}</b></div>
            <div><span>{t('common.paymentMethod')}</span><b>{selectedMethod?.name || '—'}</b></div>
            {mode === 'instant' && items.map(({ product, line }) => (
              <div className="summary-line" key={product.id}><span>{product.title} × {line.quantity}</span><b>{money(product.price * line.quantity)}</b></div>
            ))}
          </div>
          <div className="summary-total"><span>{t('common.total')}</span><strong>{money(payable)} {settings.currency}</strong></div>
          <p className="help">{t('checkout.paymentInfo')}</p>
          <div className="secure-note"><ShieldCheck size={18} /> {t('checkout.secure')}</div>
        </aside>
      </div>
    </div>
  )
}
