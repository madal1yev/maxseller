'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import type { Admin } from '@maxseller/shared'
import {
  Activity,
  Bell,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShoppingCart,
  Tags,
  Ticket,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, initials } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Asosiy',
    items: [
      { href: '/', label: 'Bosh sahifa', icon: LayoutDashboard },
      { href: '/orders', label: 'Buyurtmalar', icon: ShoppingCart },
      { href: '/payments', label: 'To\'lovlar', icon: Wallet },
    ],
  },
  {
    label: 'Katalog',
    items: [
      { href: '/products', label: 'Mahsulotlar', icon: Package },
      { href: '/categories', label: 'Kategoriyalar', icon: Tags },
      { href: '/coupons', label: 'Kuponlar', icon: Ticket },
      { href: '/payment-methods', label: 'To\'lov usullari', icon: CreditCard },
    ],
  },
  {
    label: 'Mijozlar va kontent',
    items: [
      { href: '/customers', label: 'Mijozlar', icon: Users },
      { href: '/reviews', label: 'Sharhlar', icon: MessageSquare },
      { href: '/faq', label: 'FAQ', icon: CircleHelp },
    ],
  },
  {
    label: 'Tizim',
    items: [
      { href: '/notifications', label: 'Bildirishnomalar', icon: Bell },
      { href: '/activity', label: 'Faoliyat', icon: Activity },
      { href: '/settings', label: 'Sozlamalar', icon: Settings },
    ],
  },
]

const titles: Record<string, string> = {
  '/': 'Bosh sahifa',
  '/products': 'Mahsulotlar',
  '/products/new': 'Yangi mahsulot',
  '/categories': 'Kategoriyalar',
  '/orders': 'Buyurtmalar',
  '/payments': 'To\'lovlarni tekshirish',
  '/customers': 'Mijozlar',
  '/payment-methods': 'To\'lov usullari',
  '/coupons': 'Kuponlar',
  '/reviews': 'Sharhlar',
  '/faq': 'FAQ',
  '/notifications': 'Bildirishnomalar',
  '/activity': 'Faoliyat',
  '/settings': 'Sozlamalar',
}

function pageTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith('/products/')) return 'Mahsulotni tahrirlash'
  if (pathname.startsWith('/orders/')) return 'Buyurtma tafsilotlari'
  if (pathname.startsWith('/customers/')) return 'Mijoz profili'
  return 'Boshqaruv paneli'
}

export interface AdminShellProps {
  children: ReactNode
  admin: Admin | null
  onLogout: () => void
}

export function AdminShell({ children, admin, onLogout }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setCollapsed(window.localStorage.getItem('maxseller_admin_sidebar') === 'collapsed')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => setMobileOpen(false), [pathname])

  function toggleCollapse() {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem('maxseller_admin_sidebar', next ? 'collapsed' : 'expanded')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = search.trim()
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
  }

  function handleLogout() {
    onLogout()
    router.replace('/login')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-[72px] items-center gap-3 border-b border-white/[0.06] px-4', collapsed && 'justify-center px-2')}>
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-ink-950 shadow-glow">
            <span className="font-display text-sm font-bold">M</span>
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-[13px] font-semibold text-white">MaxSeller</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-400">Admin</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5f796b]">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-brand-500/12 text-brand-300 shadow-[inset_0_0_0_1px_rgba(0,230,118,.16)]'
                        : 'text-[#93aa9c] hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    {active && <span className="absolute left-0 h-5 w-0.5 rounded-r bg-brand-500" />}
                    <Icon className={cn('h-4 w-4 shrink-0', active && 'text-brand-400')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-white/[0.06] p-3', collapsed && 'px-2')}>
        <button
          type="button"
          onClick={toggleCollapse}
          className={cn(
            'mb-2 flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#8ba397] transition hover:bg-white/[0.05] hover:text-white',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && 'Yon panelni yig\'ish'}
        </button>
        <div className={cn('flex items-center gap-3 rounded-xl bg-white/[0.035] p-2', collapsed && 'justify-center')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-ink-950">
            {initials(admin?.name ?? 'Admin')}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{admin?.name ?? 'Administrator'}</p>
              <p className="truncate text-[10px] text-[#7f998b]">{admin?.email ?? 'admin@maxseller.uz'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              title="Chiqish"
              aria-label="Chiqish"
              className="rounded-lg p-1.5 text-[#8ba397] transition hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink-950 bg-page-glow">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.06] bg-ink-900/85 backdrop-blur-xl transition-[width] duration-300 lg:block',
          collapsed ? 'w-[76px]' : 'w-[248px]',
        )}
      >
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[268px] border-r border-white/[0.08] bg-ink-900 lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Menyu yopish"
                className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-[#8ba397] hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]')}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Menyu ochish"
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-[#9db4a8] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f796b]">
              Boshqaruv paneli <ChevronRight className="h-3 w-3" /> {pageTitle(pathname)}
            </div>
            <h1 className="truncate font-display text-sm font-semibold text-white sm:text-base">
              {pageTitle(pathname)}
            </h1>
          </div>

          <form onSubmit={handleSearch} className="hidden max-w-xs flex-1 md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f998b]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mahsulot qidirish..."
                className="h-9 pl-9 text-xs"
                aria-label="Qidirish"
              />
            </div>
          </form>

          <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
            <a href={process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'} target="_blank" rel="noreferrer">
              Saytga o\'tish <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>

          <button
            type="button"
            onClick={handleLogout}
            title="Chiqish"
            aria-label="Chiqish"
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-[#9db4a8] transition hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-300 sm:hidden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {mounted ? children : null}
        </main>
      </div>
    </div>
  )
}
