import type { OrderStatus, PaymentStatus, ProductStatus, VerificationAction } from '@maxseller/shared'
import { orderStatusLabels } from '@maxseller/shared'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const orderVariants: Record<OrderStatus, BadgeProps['variant']> = {
  PENDING_PAYMENT: 'warning',
  RECEIPT_SUBMITTED: 'info',
  PAYMENT_REVIEW: 'warning',
  PAID: 'success',
  COMPLETED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'secondary',
  REFUNDED: 'info',
}

const productLabels: Record<ProductStatus, string> = {
  DRAFT: 'Qoralama',
  PUBLISHED: 'Nashr etilgan',
  HIDDEN: 'Yashirilgan',
  ARCHIVED: 'Arxivlangan',
}

const productVariants: Record<ProductStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  HIDDEN: 'warning',
  ARCHIVED: 'danger',
}

const paymentLabels: Record<PaymentStatus, string> = {
  PENDING: 'Kutilmoqda',
  PENDING_REVIEW: 'Tekshirilmoqda',
  PAID: 'To\'langan',
  FAILED: 'Xatolik',
  REFUNDED: 'Qaytarilgan',
  REJECTED: 'Rad etilgan',
}

const paymentVariants: Record<PaymentStatus, BadgeProps['variant']> = {
  PENDING: 'warning',
  PENDING_REVIEW: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'info',
  REJECTED: 'danger',
}

const verificationLabels: Record<VerificationAction, string> = {
  APPROVE: 'Tasdiqlandi',
  REJECT: 'Rad etildi',
  REQUEST_RECEIPT: 'Yangi chek so\'raldi',
}

const verificationVariants: Record<VerificationAction, BadgeProps['variant']> = {
  APPROVE: 'success',
  REJECT: 'danger',
  REQUEST_RECEIPT: 'warning',
}

function Dot({ className }: { className?: string }) {
  return <span className={cn('h-1.5 w-1.5 rounded-full bg-current', className)} />
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge variant={orderVariants[status] ?? 'secondary'} className={className}>
      <Dot />
      {orderStatusLabels[status] ?? status}
    </Badge>
  )
}

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <Badge variant={productVariants[status] ?? 'secondary'} className={className}>
      <Dot />
      {productLabels[status] ?? status}
    </Badge>
  )
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Badge variant={paymentVariants[status] ?? 'secondary'} className={className}>
      <Dot />
      {paymentLabels[status] ?? status}
    </Badge>
  )
}

export function VerificationBadge({
  action,
  className,
}: {
  action: VerificationAction
  className?: string
}) {
  return (
    <Badge variant={verificationVariants[action] ?? 'secondary'} className={className}>
      {verificationLabels[action] ?? action}
    </Badge>
  )
}

export { productLabels, paymentLabels }
