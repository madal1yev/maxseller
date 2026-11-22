import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, PackageOpen } from 'lucide-react'
import { paymentKey, statusKey, useI18n, type I18nKey } from '../shared/i18n'
import type { OrderStatus, PaymentStatus } from '../shared/types'

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n()
  const tone = ['CANCELLED', 'REFUNDED'].includes(status) ? 'bad'
    : ['PAID', 'COMPLETED', 'DELIVERED', 'READY_FOR_DELIVERY'].includes(status) ? 'good'
      : ['NEW', 'PENDING_CONFIRMATION', 'AWAITING_PAYMENT'].includes(status) ? 'warn' : 'info'
  return <span className={`badge status ${tone}`}>{t(statusKey(status) as I18nKey) || status}</span>
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { t } = useI18n()
  const tone = status === 'PAID' ? 'good' : status === 'REVIEW' ? 'warn' : status === 'FAILED' || status === 'REFUNDED' ? 'bad' : 'neutral'
  const key = paymentKey(status)
  return <span className={`badge status ${tone}`}>{t(key as I18nKey) || status}</span>
}

export function Loading({ text }: { text?: string }) {
  const { t } = useI18n()
  return <div className="empty-state"><LoaderCircle className="spin" /><p>{text || t('common.loading')}</p></div>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="notice error-notice">
      <AlertCircle size={20} />
      <div><b>{t('common.error')}</b><span>{message}</span></div>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  )
}

export function EmptyState({ title, text, children, icon }: { title: string; text?: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty-state">
      {icon || <PackageOpen />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children && <div style={{ marginTop: 18 }}>{children}</div>}
    </div>
  )
}

export function Toast({ message }: { message: string }) {
  if (!message) return null
  return <div className="toast" role="status"><CheckCircle2 /> {message}</div>
}

export function PageHead({ eyebrow, title, text, children }: { eyebrow?: string; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      {eyebrow && <span className="chip">{eyebrow}</span>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
      {children && <div className="page-head-actions">{children}</div>}
    </div>
  )
}
