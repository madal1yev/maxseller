import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { CheckCircle2, Clock3, Download, FileText, Package, RefreshCw, Upload } from 'lucide-react'
import { api, date, downloadBlob, fileToDataUrl, money } from '../shared/api'
import { statusKey, useI18n, type I18nKey } from '../shared/i18n'
import type { OrderDetail, User } from '../shared/types'
import { go } from './router'
import { ErrorBox, Loading, PaymentBadge, StatusBadge } from './ui'

interface Props {
  id: string
  user: User | null
  notify: (message: string) => void
}

export default function OrderPage({ id, user, notify }: Props) {
  const { t } = useI18n()
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [receiptName, setReceiptName] = useState('')
  const [note, setNote] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setDetail(await api.orderDetails(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order.loadFailed'))
    }
  }, [id, t])

  useEffect(() => { void load() }, [load])

  const onReceipt = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await fileToDataUrl(file)
      setReceipt(data)
      setReceiptName(file.name)
      setActionError('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('order.fileReadFailed'))
    }
  }

  const submitPayment = async () => {
    if (!receipt) { setActionError(t('order.noReceipt')); return }
    setBusy(true)
    setActionError('')
    try {
      await api.submitPayment(id, { receipt, note, method: detail?.order.paymentMethod })
      setReceipt('')
      setReceiptName('')
      setNote('')
      notify(t('order.receiptSent'))
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('order.receiptFailed'))
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    setBusy(true)
    try {
      const result = await api.downloadToken(id)
      window.open(result.url, '_blank', 'noopener,noreferrer')
      notify(t('cabinet.fileLinkOpened'))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('order.noFile'))
    } finally {
      setBusy(false)
    }
  }

  const downloadReceipt = async () => {
    setBusy(true)
    try {
      const blob = await api.orderReceipt(id)
      downloadBlob(blob, `${detail?.order.orderNumber || 'order'}.pdf`)
      notify(t('order.receiptDownloaded'))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('order.documentFailed'))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!window.confirm(t('order.confirmCancel'))) return
    setBusy(true)
    try {
      await api.cancelOrder(id)
      notify(t('order.cancelled'))
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('order.cancelFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="store-page"><ErrorBox message={error} onRetry={() => void load()} /></div>
  if (!detail) return <div className="store-page"><Loading text={t('order.loading')} /></div>

  const { order, history, payments, receipts } = detail
  const canPay = ['NEW', 'PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_PROCESSING'].includes(order.status)
  const canDownload = order.paymentStatus === 'PAID' && ['IN_PROGRESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status)

  return (
    <div className="store-page order-page">
      <div className="order-success">
        <Package size={34} />
        <div>
          <h1>{t('order.details')}</h1>
          <p>{t('order.numberLine', { number: order.orderNumber })}</p>
        </div>
      </div>

      {actionError && <ErrorBox message={actionError} />}

      <div className="order-grid">
        <div className="order-main">
          <section className="panel">
            <div className="panel-head">
              <div><h2>{t('order.statusTitle')}</h2><p>{t('order.created')} {date(order.createdAt)}</p></div>
              <div className="badge-row"><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>
            </div>
            {order.rejectReason && <div className="notice warn-notice">{t('order.reason')} {order.rejectReason}</div>}
            <div className="status-track">
              {['NEW', 'AWAITING_PAYMENT', 'PAID', 'READY_FOR_DELIVERY', 'COMPLETED'].map((step) => {
                const index = ['NEW', 'AWAITING_PAYMENT', 'PAID', 'READY_FOR_DELIVERY', 'COMPLETED'].indexOf(order.status)
                const stepIndex = ['NEW', 'AWAITING_PAYMENT', 'PAID', 'READY_FOR_DELIVERY', 'COMPLETED'].indexOf(step)
                const done = index >= stepIndex && index >= 0
                return (
                  <div className={`track-step${done ? ' done' : ''}${order.status === step ? ' current' : ''}`} key={step}>
                    <span>{done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}</span>
                    <small>{t(statusKey(step) as I18nKey)}</small>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><div><h2>{t('common.products')}</h2><p>{order.type === 'custom' ? t('common.custom') : t('order.itemsCount', { count: order.items.length })}</p></div></div>
            {order.items.length ? (
              <div className="order-items">
                {order.items.map((item, i) => (
                  <div className="order-item" key={`${item.productId}-${i}`}>
                    <img src={item.image || '/favicon.svg'} alt="" />
                    <div><b>{item.title}</b><span>{item.quantity} x {money(item.price)}</span></div>
                    <strong>{money(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="custom-box">
                <div><span className="muted">{t('order.projectType')}</span><b>{order.projectType || '—'}</b></div>
                <div className="span-2"><span className="muted">{t('order.requirements')}</span><p>{order.requirements || '—'}</p></div>
              </div>
            )}
            <div className="order-total"><span>{t('common.total')}</span><strong>{money(order.total)} {t('common.currency')}</strong></div>
          </section>

          <section className="panel">
            <div className="panel-head"><div><h2>{t('order.paymentTitle')}</h2><p>{t('order.paymentMethodLine', { method: order.paymentMethod })}</p></div><PaymentBadge status={order.paymentStatus} /></div>
            {order.paymentStatus !== 'PAID' ? (
              canPay ? (
                <div className="payment-upload">
                  <p className="muted">{t('order.uploadHint')}</p>
                  <label className="upload-box">
                    <Upload size={20} />
                    <span>{receiptName || t('order.receiptChoose')}</span>
                    <input type="file" accept="image/*" onChange={(e) => void onReceipt(e)} hidden />
                  </label>
                  {receipt && <img className="receipt-preview" src={receipt} alt={t('order.receiptAlt')} />}
                  <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('order.transactionNote')} />
                  <button className="btn btn-sm" onClick={() => void submitPayment()} disabled={busy || !receipt}>{busy ? t('checkout.submitting') : t('order.sendReceipt')}</button>
                </div>
              ) : (
                <p className="muted">{t('order.cannotPay')}</p>
              )
            ) : (
              <div className="notice good-notice"><CheckCircle2 size={18} /> {t('order.paymentConfirmed')}</div>
            )}
            {payments.length > 0 && (
              <div className="mini-list">
                {payments.map((payment) => (
                  <div key={payment.id}><span>{date(payment.createdAt)}</span><b>{money(payment.amount)} {t('common.currency')}</b><PaymentBadge status={payment.status} /></div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><div><h2>{t('order.history')}</h2><p>{t('order.historyText')}</p></div></div>
            <div className="timeline">
              {history.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span />
                  <div><b>{t(statusKey(item.to) as I18nKey) || item.to}</b><small>{date(item.at)} · {item.actor}</small>{item.reason && <p>{item.reason}</p>}</div>
                </div>
              ))}
              {history.length === 0 && <p className="muted">{t('order.noHistory')}</p>}
            </div>
          </section>
        </div>

        <aside className="order-side">
          <section className="panel">
            <h2>{t('order.actions')}</h2>
            <div className="side-actions">
              {canDownload && <button className="btn btn-sm" onClick={() => void download()} disabled={busy}><Download size={16} /> {t('order.downloadProduct')}</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => void downloadReceipt()} disabled={busy}><FileText size={16} /> {t('order.downloadReceipt')}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={16} /> {t('common.refresh')}</button>
              {['NEW', 'PENDING_CONFIRMATION', 'AWAITING_PAYMENT'].includes(order.status) && (
                <button className="btn btn-danger btn-sm" onClick={() => void cancel()} disabled={busy}>{t('order.cancel')}</button>
              )}
            </div>
            <p className="help">{t('order.pdfNote')}</p>
          </section>

          <section className="panel">
            <h2>{t('order.customer')}</h2>
            <div className="customer-box">
              <div><span className="muted">{t('common.name')}</span><b>{order.customer.name}</b></div>
              <div><span className="muted">{t('common.phone')}</span><b>{order.customer.phone}</b></div>
              {order.customer.telegramUsername && <div><span className="muted">Telegram</span><b>@{order.customer.telegramUsername}</b></div>}
            </div>
          </section>

          {receipts.length > 0 && (
            <section className="panel">
              <h2>{t('order.documents')}</h2>
              {receipts.map((item) => <div className="doc-line" key={item.id}><FileText size={16} /><span>{item.number}</span></div>)}
            </section>
          )}

          <button className="link-button" onClick={() => go('/cabinet?tab=orders')}>{t('order.allMine')} →</button>
          {!user && (
            <button className="link-button" onClick={() => go('/login')}>{t('order.toCabinet')} →</button>
          )}
        </aside>
      </div>
    </div>
  )
}
