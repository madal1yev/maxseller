import { Badge } from '@/components/ui/badge'
import { orderStatusLabels, type OrderStatus } from '@maxseller/shared'

const variantByStatus: Record<string, 'warning' | 'info' | 'success' | 'destructive' | 'secondary'> = {
  PENDING_PAYMENT: 'warning',
  RECEIPT_SUBMITTED: 'info',
  PAYMENT_REVIEW: 'info',
  PAID: 'success',
  COMPLETED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
  REFUNDED: 'secondary',
}

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  return (
    <Badge variant={variantByStatus[status] ?? 'secondary'}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {orderStatusLabels[status] ?? status}
    </Badge>
  )
}
