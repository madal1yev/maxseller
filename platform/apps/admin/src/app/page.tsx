'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  PackageCheck,
  ShoppingCart,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Order } from '@maxseller/shared'
import { formatDate, formatMoney } from '@maxseller/shared'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { OrderStatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { SalesChart } from '@/components/sales-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminActivity, useAdminDashboard } from '@/lib/api-queries'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: string
  delay?: number
}

function StatCard({ label, value, icon: Icon, tone = 'text-brand-400', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="panel-hover relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/10 blur-2xl" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7f998b]">{label}</p>
            <p className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl">{value}</p>
          </div>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] ${tone}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>
      </Card>
    </motion.div>
  )
}

const recentOrderColumns: DataTableColumn<Order>[] = [
  {
    key: 'number',
    header: 'Buyurtma',
    sortValue: (order) => order.orderNumber,
    cell: (order) => (
      <Link href={`/orders/${order.id}`} className="font-semibold text-white hover:text-brand-400">
        #{order.orderNumber}
      </Link>
    ),
  },
  {
    key: 'customer',
    header: 'Mijoz',
    cell: (order) => (
      <div>
        <p className="text-sm text-white">{order.user?.name ?? 'Mijoz'}</p>
        <p className="text-[11px] text-[#7f998b]">{order.user?.email ?? '—'}</p>
      </div>
    ),
  },
  {
    key: 'total',
    header: 'Summa',
    sortValue: (order) => order.total,
    cell: (order) => <span className="font-semibold text-brand-300">{formatMoney(order.total)}</span>,
  },
  {
    key: 'status',
    header: 'Holat',
    cell: (order) => <OrderStatusBadge status={order.status} />,
  },
  {
    key: 'date',
    header: 'Sana',
    sortValue: (order) => order.createdAt,
    cell: (order) => <span className="text-xs text-[#8ba397]">{formatDate(order.createdAt)}</span>,
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const dashboard = useAdminDashboard()
  const activity = useAdminActivity(1)
  const stats = dashboard.data

  return (
    <div>
      <PageHeader
        title="Bosh sahifa"
        description="Do'koningizning bugungi holati va so'nggi faoliyati."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/payments">To\'lovlarni tekshirish <ArrowUpRight className="h-4 w-4" /></Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami mahsulotlar" value={stats?.totalProducts ?? '—'} icon={Boxes} delay={0} />
        <StatCard label="Nashr etilgan" value={stats?.publishedProducts ?? '—'} icon={BadgeCheck} tone="text-sky-300" delay={0.04} />
        <StatCard label="Jami buyurtmalar" value={stats?.totalOrders ?? '—'} icon={ShoppingCart} tone="text-amber-300" delay={0.08} />
        <StatCard label="Yangi buyurtmalar" value={stats?.newOrders ?? '—'} icon={Sparkles} tone="text-brand-300" delay={0.12} />
        <StatCard label="Tekshiruvda" value={stats?.pendingReview ?? '—'} icon={ClipboardCheck} tone="text-amber-300" delay={0.16} />
        <StatCard label="Bajarilgan" value={stats?.completedOrders ?? '—'} icon={PackageCheck} tone="text-emerald-300" delay={0.2} />
        <StatCard label="Jami daromad" value={stats ? formatMoney(stats.totalRevenue) : '—'} icon={CircleDollarSign} delay={0.24} />
        <StatCard label="Mijozlar" value={stats?.totalCustomers ?? '—'} icon={Users} tone="text-sky-300" delay={0.28} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Sotuvlar dinamikasi</CardTitle>
              <p className="mt-1 text-xs text-[#8ba397]">Kun bo'yicha buyurtmalar va tushum</p>
            </div>
            <Badge variant="secondary">{stats?.salesChart?.length ?? 0} kun</Badge>
          </CardHeader>
          <CardContent>
            {dashboard.isLoading ? (
              <Skeleton className="h-60 w-full rounded-2xl" />
            ) : dashboard.isError ? (
              <div className="grid h-60 place-items-center text-sm text-red-300">
                Grafik ma\'lumotlari yuklanmadi
              </div>
            ) : (
              <SalesChart data={stats?.salesChart ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eng ko'p sotilganlar</CardTitle>
            <p className="mt-1 text-xs text-[#8ba397]">Eng yuqori tushum keltirgan mahsulotlar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)
            ) : stats?.bestSellers?.length ? (
              (() => {
                const maxUnits = Math.max(...stats.bestSellers.map((item) => item.units), 1)
                return stats.bestSellers.slice(0, 6).map((item, index) => (
                  <div key={item.productId}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <Link
                        href={`/products/${item.productId}`}
                        className="min-w-0 truncate font-medium text-white hover:text-brand-400"
                      >
                        <span className="mr-2 text-[#5f796b]">{index + 1}.</span>
                        {item.title}
                      </Link>
                      <span className="shrink-0 text-brand-300">{item.units} dona</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-300"
                        style={{ width: `${(item.units / maxUnits) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              })()
            ) : (
              <p className="py-8 text-center text-sm text-[#8ba397]">Hozircha sotuv yo'q</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">So'nggi buyurtmalar</h3>
            <Button asChild variant="ghost" size="sm">
              <Link href="/orders">Barchasi <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <DataTable
            columns={recentOrderColumns}
            data={stats?.recentOrders ?? []}
            rowKey={(order) => order.id}
            onRowClick={(order) => router.push(`/orders/${order.id}`)}
            loading={dashboard.isLoading}
            error={dashboard.isError ? dashboard.error : undefined}
            onRetry={() => void dashboard.refetch()}
            emptyTitle="Buyurtma yo'q"
            emptyDescription="Yangi buyurtmalar bu yerda paydo bo'ladi."
            skeletonRows={5}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-400" /> So'nggi faoliyat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)
            ) : activity.data?.items?.length ? (
              activity.data.items.slice(0, 5).map((log) => (
                <div key={log.id} className="flex gap-3 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 shadow-glow" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">
                      {log.adminName ?? 'Tizim'} <span className="font-normal text-[#8ba397]">· {log.action}</span>
                    </p>
                    <p className="truncate text-[11px] text-[#7f998b]">
                      {log.details ?? `${log.entity}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[#5f796b]">{formatDate(log.createdAt)}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-[#8ba397]">Faoliyat topilmadi</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
