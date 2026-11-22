import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Activity, BadgeCheck, Bot, Check, Clock3, Download, FileText, KeyRound,
  LogOut, Package, RefreshCw, ShieldCheck, ShoppingBag, UserRound, Wallet,
} from 'lucide-react'
import { api, date, describeApiError, downloadBlob, money } from '../shared/api'
import { useI18n } from '../shared/i18n'
import type {
  AccountStatus, ActivityItem, Delivery, OtpRequestResult,
  Order, Payment, Purchase, Receipt, User,
} from '../shared/types'
import { loadCart } from './cart'
import { go, orderPath, type CabinetTab } from './router'
import { EmptyState, ErrorBox, Loading, PageHead, PaymentBadge, StatusBadge } from './ui'

interface Props {
  user: User
  tab: CabinetTab
  onLogout: () => void
  onUser: (user: User) => void
  notify: (message: string) => void
}

export default function Cabinet({ user, tab, onLogout, onUser, notify }: Props) {
  const { t } = useI18n()
  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState<{
    customer: User
    purchases: Purchase[]
    receipts: Receipt[]
    deliveries: Delivery[]
    transactions: Payment[]
    activity: ActivityItem[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone, email: user.email || '' })
  const [passwords, setPasswords] = useState({ current: '', next: '' })
  const [busy, setBusy] = useState(false)
  const [linkCode, setLinkCode] = useState('')

  const [emailChanged, setEmailChanged] = useState(false)
  const [emailVerify, setEmailVerify] = useState<OtpRequestResult | null>(null)
  const [contactCode, setContactCode] = useState('')
  const [contactResendLeft, setContactResendLeft] = useState(0)
  const [contactBusy, setContactBusy] = useState(false)
  const [contactError, setContactError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [orderResult, summaryResult] = await Promise.allSettled([api.myOrders(), api.customerSummary()])
      const messages: string[] = []
      if (orderResult.status === 'fulfilled') {
        setOrders(orderResult.value.orders)
      } else {
        messages.push(describeApiError(orderResult.reason))
      }
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value)
        onUser(summaryResult.value.customer)
      } else {
        messages.push(describeApiError(summaryResult.reason))
      }
      setError(messages.join(' · '))
    } finally {
      setLoading(false)
    }
  }, [onUser])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setProfile({ name: user.name, phone: user.phone, email: user.email || '' }) }, [user])

  useEffect(() => {
    if (!emailVerify) return
    const timer = window.setInterval(() => setContactResendLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [emailVerify])

  const startEmailVerification = async () => {
    setContactError('')
    setContactBusy(true)
    try {
      const result = await api.otpRequest({
        channel: 'email',
        name: profile.name.trim(),
        email: profile.email.trim(),
        purpose: 'verify_contact',
        cart: loadCart(),
      })
      setEmailVerify(result)
      setContactResendLeft(result.resendAfterSeconds)
      setContactCode('')
      notify(t('auth.codeDelivered'))
    } catch (err) {
      setContactError(describeApiError(err))
    } finally {
      setContactBusy(false)
    }
  }

  const resendContactCode = async () => {
    setContactError('')
    setContactBusy(true)
    try {
      const result = await api.otpRequest({
        channel: 'email',
        name: profile.name.trim(),
        email: profile.email.trim(),
        purpose: 'verify_contact',
        cart: loadCart(),
      })
      setEmailVerify(result)
      setContactResendLeft(result.resendAfterSeconds)
      setContactCode('')
      notify(t('cabinet.newCode'))
    } catch (err) {
      setContactError(describeApiError(err))
    } finally {
      setContactBusy(false)
    }
  }

  const verifyContact = async (e: FormEvent) => {
    e.preventDefault()
    if (!emailVerify || contactCode.trim().length < 4) { setContactError(t('cabinet.enterCode')); return }
    setContactError('')
    setContactBusy(true)
    try {
      const result = await api.otpVerify({
        requestId: emailVerify.requestId,
        code: contactCode.replace(/\D/g, ''),
        purpose: 'verify_contact',
      })
      // Backend returns { ok: true, user } for contact verification; tolerate a session
      // response too without replacing the current customer session.
      onUser(result.user)
      setSummary((prev) => prev ? { ...prev, customer: result.user } : prev)
      notify(t('cabinet.emailVerified'))
      setEmailVerify(null)
      setEmailChanged(false)
      setContactCode('')
    } catch (err) {
      setContactError(describeApiError(err))
    } finally {
      setContactBusy(false)
    }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api.updateProfile({
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim(),
      })
      onUser(result.user)
      const emailNeedsVerification = profile.email.trim() !== (user.email || '')
      setEmailChanged(emailNeedsVerification)
      if (emailNeedsVerification) {
        notify(t('cabinet.savedVerify'))
        await startEmailVerification()
      } else {
        notify(t('cabinet.saved'))
      }
    } catch (err) {
      notify(describeApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.changeCustomerPassword(passwords.current, passwords.next)
      setPasswords({ current: '', next: '' })
      notify(t('cabinet.passwordSaved'))
    } catch (err) {
      notify(describeApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const linkTelegram = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await api.linkTelegram(linkCode)
      if (result.user) onUser(result.user)
      setLinkCode('')
      notify(t('cabinet.telegramLinked'))
    } catch (err) {
      notify(describeApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    setBusy(true)
    try {
      await api.unlinkTelegram()
      onUser({ ...user, telegramId: null, telegramUsername: '' })
      notify(t('cabinet.telegramUnlinked'))
    } catch (err) {
      notify(describeApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const downloadReceipt = async (orderId: string, number: string) => {
    try {
      const blob = await api.orderReceipt(orderId)
      downloadBlob(blob, `${number || 'order'}.pdf`)
    } catch (err) {
      notify(describeApiError(err))
    }
  }

  const downloadProduct = async (orderId?: string, productId?: string, url?: string) => {
    if (url) { window.open(url, '_blank', 'noopener,noreferrer'); return }
    if (!orderId) { notify(t('cabinet.orderNotFound')); return }
    try {
      const result = await api.downloadToken(orderId, undefined, productId)
      window.open(result.url, '_blank', 'noopener,noreferrer')
      notify(t('cabinet.fileLinkOpened'))
    } catch (err) {
      notify(describeApiError(err))
    }
  }

  const purchases = summary?.purchases || []
  const receipts = summary?.receipts || []
  const deliveries = summary?.deliveries || []
  const transactions = summary?.transactions || []
  const activity = summary?.activity || []
  const status: AccountStatus = user.accountStatus || 'active'
  const statusLabels: Record<AccountStatus, string> = {
    active: t('cabinet.active'),
    suspended: t('cabinet.suspended'),
    blocked: t('cabinet.blocked'),
  }

  const tabs: { id: CabinetTab; label: string; icon: typeof Package }[] = [
    { id: 'orders', label: t('cabinet.tab.orders'), icon: Package },
    { id: 'purchases', label: t('cabinet.tab.purchases'), icon: ShoppingBag },
    { id: 'payments', label: t('cabinet.tab.payments'), icon: Wallet },
    { id: 'receipts', label: t('cabinet.tab.receipts'), icon: FileText },
    { id: 'downloads', label: t('cabinet.tab.downloads'), icon: Download },
    { id: 'activity', label: t('cabinet.tab.activity'), icon: Activity },
    { id: 'profile', label: t('cabinet.tab.profile'), icon: UserRound },
  ]

  return (
    <div className="store-page cabinet-page">
      <PageHead eyebrow={t('common.cabinet')} title={t('cabinet.hello', { name: user.name })} text={t('cabinet.intro')}>
        <button className="btn btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={15} /> {t('common.refresh')}</button>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}><LogOut size={15} /> {t('common.logout')}</button>
      </PageHead>

      <div className="cabinet-tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab${tab === id ? ' active' : ''}`} aria-selected={tab === id} onClick={() => go(`/cabinet?tab=${id}`)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={() => void load()} />}

      {tab === 'orders' && (
        <section className="panel">
          {loading ? <Loading /> : orders.length === 0 ? (
            <EmptyState title={t('cabinet.noOrders')} text={t('cabinet.noOrdersText')}>
              <button className="btn btn-sm" onClick={() => go('/catalog')}>{t('checkout.toCatalog')}</button>
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="store-table">
                <thead><tr><th>{t('common.order')}</th><th>{t('common.date')}</th><th>{t('common.type')}</th><th>{t('common.amount')}</th><th>{t('common.status')}</th><th>{t('common.payment')}</th><th></th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="cell-title" data-label={t('common.order')}>#{order.orderNumber}</td>
                      <td className="muted nowrap" data-label={t('common.date')}>{date(order.createdAt)}</td>
                      <td data-label={t('common.type')}>{order.type === 'custom' ? t('cabinet.project') : t('common.product')}</td>
                      <td className="nowrap" data-label={t('common.amount')}><b>{money(order.total)}</b></td>
                      <td data-label={t('common.status')}><StatusBadge status={order.status} /></td>
                      <td data-label={t('common.payment')}><PaymentBadge status={order.paymentStatus} /></td>
                      <td data-label={t('common.open')}><button className="btn btn-ghost btn-sm" onClick={() => go(orderPath(order.id))}>{t('common.open')}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'purchases' && (
        <section className="panel">
          <div className="panel-head"><div><h2>{t('cabinet.tab.purchases')}</h2><p>{t('cabinet.purchasesText')}</p></div></div>
          {loading ? <Loading /> : purchases.length === 0 ? (
            <EmptyState title={t('cabinet.noPurchases')} text={t('cabinet.noPurchasesText')} />
          ) : (
            <div className="table-wrap">
              <table className="store-table">
                <thead><tr><th>{t('common.product')}</th><th>{t('common.order')}</th><th>{t('common.date')}</th><th>{t('common.amount')}</th><th>{t('common.status')}</th><th></th></tr></thead>
                <tbody>
                  {purchases.map((item) => (
                    <tr key={item.id}>
                      <td className="cell-title" data-label={t('common.product')}>{item.title || item.productTitle || item.productId || t('common.product')}</td>
                      <td className="muted" data-label={t('common.order')}>{item.orderNumber ? `#${item.orderNumber}` : '—'}</td>
                      <td className="muted nowrap" data-label={t('common.date')}>{date(item.purchasedAt || item.createdAt || '')}</td>
                      <td className="nowrap" data-label={t('common.amount')}><b>{money(item.total ?? item.price ?? 0)}</b></td>
                      <td data-label={t('common.status')}>{item.status ? <span className="badge on">{item.status}</span> : <span className="muted">—</span>}</td>
                      <td data-label={t('common.download')}>{item.orderId && <button className="btn btn-ghost btn-sm" onClick={() => void downloadProduct(item.orderId, item.productId)}><Download size={14} /> {t('common.download')}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'payments' && (
        <section className="panel">
          {loading ? <Loading /> : transactions.length === 0 ? (
            <EmptyState title={t('cabinet.noPayments')} text={t('cabinet.noPaymentsText')} />
          ) : (
            <div className="table-wrap">
              <table className="store-table">
                <thead><tr><th>{t('common.order')}</th><th>{t('common.date')}</th><th>{t('common.type')}</th><th>{t('common.amount')}</th><th>{t('common.status')}</th><th></th></tr></thead>
                <tbody>
                  {transactions.map((payment) => (
                    <tr key={payment.id}>
                      <td className="cell-title" data-label={t('common.order')}>#{payment.orderNumber || '—'}</td>
                      <td className="muted nowrap" data-label={t('common.date')}>{date(payment.createdAt)}</td>
                      <td data-label={t('common.type')}>{payment.method}</td>
                      <td className="nowrap" data-label={t('common.amount')}><b>{money(payment.amount)}</b></td>
                      <td data-label={t('common.status')}><PaymentBadge status={payment.status} /></td>
                      <td data-label={t('cabinet.documents')}>{payment.status === 'PAID' && <button className="btn btn-ghost btn-sm" onClick={() => void downloadReceipt(payment.orderId, payment.orderNumber || '')}><FileText size={14} /> {t('cabinet.documents')}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'receipts' && (
        <section className="panel">
          <div className="panel-head"><div><h2>{t('cabinet.documents')}</h2><p>{t('cabinet.documentsText')}</p></div></div>
          {loading ? <Loading /> : receipts.length === 0 ? (
            <EmptyState title={t('cabinet.noDocuments')} text={t('cabinet.noDocumentsText')} />
          ) : (
            <div className="table-wrap">
              <table className="store-table">
                <thead><tr><th>{t('cabinet.documents')}</th><th>{t('common.order')}</th><th>{t('common.date')}</th><th>{t('common.amount')}</th><th>{t('common.type')}</th><th></th></tr></thead>
                <tbody>
                  {receipts.map((item) => (
                    <tr key={item.id}>
                      <td className="cell-title" data-label={t('cabinet.documents')}>{item.number}</td>
                      <td className="muted" data-label={t('common.order')}>{item.orderId ? `#${item.orderId}` : '—'}</td>
                      <td className="muted nowrap" data-label={t('common.date')}>{date(item.createdAt)}</td>
                      <td className="nowrap" data-label={t('common.amount')}><b>{money(item.total)}</b></td>
                      <td data-label={t('common.type')}>{item.isFiscal ? <span className="badge on">{t('cabinet.fiscal')}</span> : <span className="badge off">{t('cabinet.internal')}</span>}</td>
                      <td data-label={t('common.download')}>{item.orderId && <button className="btn btn-ghost btn-sm" onClick={() => void downloadReceipt(item.orderId, item.number)}><Download size={14} /> {t('common.download')}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'downloads' && (
        <section className="panel">
          <div className="panel-head"><div><h2>{t('cabinet.files')}</h2><p>{t('cabinet.filesText')}</p></div></div>
          {loading ? <Loading /> : deliveries.length === 0 && purchases.length === 0 ? (
            <EmptyState title={t('cabinet.noDownloads')} text={t('cabinet.noDownloadsText')} />
          ) : (
            <div className="download-grid">
              {deliveries.map((item) => (
                <div className="download-card" key={item.id}>
                  <div className="download-icon"><Download size={20} /></div>
                  <div className="download-info">
                    <b>{item.title || item.productTitle || item.productId || t('common.product')}</b>
                    <span>{item.orderNumber ? `#${item.orderNumber} · ` : ''}{item.status || t('cabinet.ready')}</span>
                    <small>{date(item.deliveredAt || item.createdAt || '')}</small>
                  </div>
                  <button className="btn btn-sm" onClick={() => void downloadProduct(item.orderId, item.productId, item.url)}>{t('common.download')}</button>
                </div>
              ))}
              {purchases.filter((item) => !deliveries.some((d) => d.productId && d.productId === item.productId)).map((item) => (
                <div className="download-card" key={`purchase-${item.id}`}>
                  <div className="download-icon"><Package size={20} /></div>
                  <div className="download-info">
                    <b>{item.title || item.productTitle || item.productId || t('common.product')}</b>
                    <span>{item.orderNumber ? `#${item.orderNumber}` : t('cabinet.purchase')}</span>
                    <small>{item.fileName || t('cabinet.fileOnOrder')}</small>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => void downloadProduct(item.orderId, item.productId)}>{t('common.download')}</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'activity' && (
        <section className="panel">
          <div className="panel-head"><div><h2>{t('cabinet.activityTitle')}</h2><p>{t('cabinet.activityText')}</p></div></div>
          {loading ? <Loading /> : activity.length === 0 ? (
            <EmptyState title={t('cabinet.noActivity')} text={t('cabinet.noActivityText')} icon={<Activity />} />
          ) : (
            <div className="timeline compact">
              {activity.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span />
                  <div><b>{item.action}</b><small>{date(item.at)}{item.actor ? ` · ${item.actor}` : ''}</small>{item.entity && <p>{item.entity}</p>}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'profile' && (
        <div className="profile-grid">
          <section className="panel">
            <div className="panel-head"><div><h2>{t('cabinet.personal')}</h2><p>{t('cabinet.personalText')}</p></div></div>
            <div className="account-facts">
              <div><span>{t('cabinet.customerId')}</span><b>{user.customerNumber || '—'}</b></div>
              <div><span>{t('cabinet.accountStatus')}</span><span className={`badge ${status === 'active' ? 'on' : status === 'suspended' ? 'warn-badge' : 'off'}`}>{statusLabels[status]}</span></div>
              <div><span>{t('cabinet.joined')}</span><b>{date(user.createdAt)}</b></div>
              <div><span>{t('cabinet.lastLogin')}</span><b>{date(user.lastLoginAt || '')}</b></div>
              <div><span>{t('common.phone')}</span>{user.phoneVerified ? <span className="badge on"><BadgeCheck size={13} /> {t('common.verified')}</span> : <span className="badge off">{t('common.unverified')}</span>}</div>
              <div><span>{t('common.email')}</span>{user.emailVerified ? <span className="badge on"><BadgeCheck size={13} /> {t('common.verified')}</span> : <span className="badge off">{t('common.unverified')}</span>}</div>
            </div>
            <form className="form-grid profile-form" onSubmit={saveProfile}>
              <div className="field"><label htmlFor="pf-name">{t('common.name')}</label><input id="pf-name" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></div>
              <div className="field"><label htmlFor="pf-phone">{t('common.phone')}</label><input id="pf-phone" className="input" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} required /></div>
              <div className="field span-2"><label htmlFor="pf-email">{t('common.email')}</label><input id="pf-email" className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="name@example.com" /></div>
              <div className="span-2"><button className="btn btn-sm" disabled={busy || contactBusy}><Check size={16} /> {t('common.save')}</button></div>
            </form>

            {emailVerify && (
              <div className="contact-verify">
                <h3><ShieldCheck size={17} /> {t('cabinet.newEmail')}</h3>
                <p className="muted">{t('cabinet.codeSentTo')} <b>{emailVerify.destinationMasked}</b></p>
                <form className="verify-row" onSubmit={verifyContact}>
                  <input className="input otp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={contactCode} onChange={(e) => setContactCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-label={t('auth.code')} />
                  <button className="btn btn-sm" disabled={contactBusy}>{t('common.confirm')}</button>
                </form>
                {contactError && <p className="error">{contactError}</p>}
                <button className="link-button" disabled={contactBusy || contactResendLeft > 0} onClick={() => void resendContactCode()}>
                  {contactResendLeft > 0 ? t('cabinet.resendIn', { seconds: contactResendLeft }) : t('auth.resend')}
                </button>
              </div>
            )}
            {!emailVerify && contactError && <p className="error">{contactError}</p>}
            {emailChanged && !emailVerify && <p className="help">{t('cabinet.emailChanged')}</p>}

            <div className="divider" />
            <h3 className="section-title"><KeyRound size={17} /> {t('cabinet.passwordTitle')}</h3>
            <p className="help">{t('cabinet.passwordHelp')}</p>
            <form className="form-grid profile-form" onSubmit={changePassword}>
              <div className="field"><label htmlFor="pw-current">{t('cabinet.currentPassword')}</label><input id="pw-current" className="input" type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} autoComplete="current-password" /></div>
              <div className="field"><label htmlFor="pw-next">{t('cabinet.newPassword')}</label><input id="pw-next" className="input" type="password" minLength={6} value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} autoComplete="new-password" required /></div>
              <div className="span-2"><button className="btn btn-ghost btn-sm" disabled={busy}>{t('cabinet.savePassword')}</button></div>
            </form>
          </section>

          <aside className="profile-side">
            <section className="panel">
              <div className="panel-head"><div><h2>{t('cabinet.notifications')}</h2><p>{t('cabinet.notificationHelp')}</p></div><Bot size={22} color="var(--green)" /></div>
              {user.telegramId ? (
                <div className="notice good-notice"><Check size={18} /> @{user.telegramUsername || 'Telegram'} {t('cabinet.telegramLinkedShort')}</div>
              ) : (
                <p className="muted">{t('cabinet.telegramHint')}</p>
              )}
              <form className="telegram-link" onSubmit={linkTelegram}>
                <input className="input" value={linkCode} onChange={(e) => setLinkCode(e.target.value)} placeholder={t('cabinet.linkCode')} maxLength={10} aria-label={t('cabinet.linkCode')} />
                <button className="btn btn-sm" disabled={busy || !linkCode.trim()}>{t('cabinet.link')}</button>
              </form>
              {user.telegramId && <button className="link-button" disabled={busy} onClick={() => void unlink()}>{t('cabinet.unlink')}</button>}
              <p className="help">{t('cabinet.notifications')}: {user.telegramNotifications ? t('cabinet.notifyOn') : t('cabinet.notifyOff')}. {t('cabinet.websiteOnly')}</p>
            </section>

            <section className="panel">
              <div className="panel-head"><div><h2>{t('cabinet.summary')}</h2></div><Clock3 size={20} color="var(--green)" /></div>
              <div className="account-facts compact-facts">
                <div><span>{t('common.orders')}</span><b>{orders.length}</b></div>
                <div><span>{t('cabinet.tab.payments')}</span><b>{transactions.length}</b></div>
                <div><span>{t('cabinet.tab.purchases')}</span><b>{purchases.length}</b></div>
                <div><span>{t('cabinet.tab.receipts')}</span><b>{receipts.length}</b></div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
