import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Download, FileText, Package, Wallet } from 'lucide-react'
import { api, date, money } from '../shared/api'
import { statusKey, useI18n, type I18nKey } from '../shared/i18n'
import type { OrderDetail } from '../shared/types'
import { go, orderPath } from './router'
import { ErrorBox, Loading, PaymentBadge, StatusBadge } from './ui'

export default function Success({ id }: { id: string }) {
  const { t } = useI18n()
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setDetail(await api.orderDetails(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order.loadFailed'))
    }
  }, [id, t])

  useEffect(() => { void load() }, [load])

  if (error) return <div className="store-page"><ErrorBox message={error} onRetry={() => void load()} /></div>
  if (!detail) return <div className="store-page"><Loading text={t('order.loading')} /></div>

  const { order } = detail

  return (
    <div className="store-page success-page">
      <div className="success-hero">
        <span className="success-icon"><CheckCircle2 size={44} /></span>
        <span className="chip"><i /> {t('success.accepted')}</span>
        <h1>{t('success.thanks', { name: order.customer.name })}</h1>
        <p>{t('success.saved')}</p>
        <div className="success-number">{t('success.number')} <strong>#{order.orderNumber}</strong></div>
      </div>

      <div className="success-card panel">
        <div className="success-head">
          <div>
            <h2>{t('success.details')}</h2>
            <p><Clock3 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {date(order.createdAt)}</p>
          </div>
          <div className="badge-row"><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>
        </div>

        <div className="success-meta">
          <div><span>{t('common.status')}</span><b>{t(statusKey(order.status) as I18nKey) || order.status}</b></div>
          <div><span>{t('success.paymentStatus')}</span><b>{t(('payment.' + order.paymentStatus) as I18nKey) || order.paymentStatus}</b></div>
          <div><span>{t('common.paymentMethod')}</span><b>{order.paymentMethod || '—'}</b></div>
          <div><span>{t('common.type')}</span><b>{order.type === 'custom' ? t('common.custom') : t('common.readyProduct')}</b></div>
        </div>

        <div className="success-items">
          <h3><Package size={17} /> {t('common.products')}</h3>
          {order.items.length ? order.items.map((item, index) => (
            <div className="order-item" key={`${item.productId}-${index}`}>
              <img src={item.image || '/favicon.svg'} alt="" />
              <div><b>{item.title}</b><span>{item.quantity} × {money(item.price)}</span></div>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          )) : (
            <div className="custom-box">
              <div><span className="muted">{t('order.projectType')}</span><b>{order.projectType || '—'}</b></div>
              <div className="span-2"><span className="muted">{t('order.requirements')}</span><p>{order.requirements || '—'}</p></div>
            </div>
          )}
        </div>

        <div className="order-total"><span>{t('common.total')}</span><strong>{money(order.total)} {t('common.currency')}</strong></div>
      </div>

      <div className="success-actions">
        <button className="btn" onClick={() => go('/cabinet?tab=orders')}><Package size={17} /> {t('success.myOrders')}</button>
        <button className="btn btn-ghost" onClick={() => go(orderPath(order.id))}><FileText size={17} /> {t('order.details')}</button>
      </div>

      <div className="success-help">
        <Wallet size={16} /> {t('success.paymentTip')}
        <Download size={16} /> {t('success.fileTip')}
      </div>
    </div>
  )
}
