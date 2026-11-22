'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  Download,
  Heart,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingCart,
  Sun,
  UserRound,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth, useCart, useTheme } from '@/components/providers'
import { getCategories, queryKeys } from '@/lib/api-queries'
import { categoryIcon } from '@/lib/category-icons'
import { cn } from '@/lib/utils'

const mainLinks = [
  { href: '/', label: 'Bosh sahifa' },
  { href: '/products', label: 'Mahsulotlar' },
  { href: '/categories', label: 'Kategoriyalar' },
  { href: '/about', label: 'Biz haqimizda' },
]

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const { count } = useCart()
  const [query, setQuery] = React.useState('')
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: getCategories,
  })
  const categories = (categoriesQuery.data ?? []).slice(0, 6)

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (value) router.push(`/search?q=${encodeURIComponent(value)}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/85 backdrop-blur-xl">
      <div className="container-page flex h-[72px] items-center gap-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="MaxSeller bosh sahifa">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald text-black shadow-glow transition-transform group-hover:rotate-6">
            <Zap className="h-5 w-5 fill-black" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-extrabold tracking-tight">
              Max<span className="text-emerald">Seller</span>
            </span>
            <span className="mt-1 hidden text-[10px] font-medium text-muted sm:block">
              Raqamli mahsulotlar bir joyda!
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold transition',
                pathname === link.href
                  ? 'bg-emerald/10 text-emerald'
                  : 'text-foreground/70 hover:bg-white/[0.06] hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
          {categories.length > 0 ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-foreground/70 transition hover:bg-white/[0.06] hover:text-foreground">
                  Katalog
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={10}
                  className="z-[70] min-w-[260px] rounded-2xl border border-white/10 bg-card p-2 shadow-glow-lg"
                >
                  {categories.map((category) => {
                    const Icon = categoryIcon(category.icon)
                    return (
                      <DropdownMenu.Item key={category.id} asChild>
                        <Link
                          href={`/categories/${category.slug}`}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition data-[highlighted]:bg-emerald/10 data-[highlighted]:text-emerald"
                        >
                          <Icon className="h-4 w-4 text-emerald" />
                          {category.nameUz || category.name}
                        </Link>
                      </DropdownMenu.Item>
                    )
                  })}
                  <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/categories"
                      className="block cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald outline-none data-[highlighted]:bg-emerald/10"
                    >
                      Barcha kategoriyalar →
                    </Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden w-full max-w-[280px] md:block xl:max-w-[360px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mahsulot qidirish..."
              aria-label="Mahsulot qidirish"
              className="field h-10 py-2 pl-9 text-sm"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Yorug\' rejim' : 'Qorong\'u rejim'}
            title={theme === 'dark' ? 'Yorug\' rejim' : 'Qorong\'u rejim'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Link href="/favorites" aria-label="Sevimlilar" className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon" asChild>
              <span>
                <Heart className="h-5 w-5" />
              </span>
            </Button>
          </Link>

          <Link href="/cart" aria-label="Savat" className="relative">
            <Button variant="ghost" size="icon" asChild>
              <span>
                <ShoppingCart className="h-5 w-5" />
              </span>
            </Button>
            {count > 0 ? (
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald px-1 text-[10px] font-extrabold text-black">
                {count}
              </span>
            ) : null}
          </Link>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="icon" aria-label="Akkaunt">
                <UserRound className="h-5 w-5" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={10}
                className="z-[70] min-w-[210px] rounded-2xl border border-white/10 bg-card p-2 shadow-glow-lg"
              >
                {isAuthenticated ? (
                  <>
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <p className="truncate text-sm font-bold">{user?.name ?? 'Mijoz'}</p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                    </div>
                    <DropdownMenu.Item asChild>
                      <Link href="/profile" className="account-item">
                        <UserRound className="h-4 w-4" /> Profilim
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/orders" className="account-item">
                        <Package className="h-4 w-4" /> Mening xaridlarim
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/downloads" className="account-item">
                        <Download className="h-4 w-4" /> Yuklamalarim
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/favorites" className="account-item">
                        <Heart className="h-4 w-4" /> Sevimlilarim
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
                    <DropdownMenu.Item asChild>
                      <button type="button" onClick={logout} className="account-item text-red-400">
                        <LogOut className="h-4 w-4" /> Chiqish
                      </button>
                    </DropdownMenu.Item>
                  </>
                ) : (
                  <>
                    <DropdownMenu.Item asChild>
                      <Link href="/login" className="account-item">
                        <LogIn className="h-4 w-4" /> Kirish
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/register" className="account-item text-emerald">
                        <UserRound className="h-4 w-4" /> Ro'yxatdan o'tish
                      </Link>
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menyu">
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogTitle className="mb-5">Menyu</DialogTitle>
              <form onSubmit={handleSearch} className="mb-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Mahsulot qidirish..."
                    aria-label="Mahsulot qidirish"
                    className="field pl-9"
                  />
                </div>
              </form>
              <nav className="flex flex-col gap-1">
                {mainLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-emerald/10 hover:text-emerald"
                  >
                    {link.label}
                  </Link>
                ))}
                <p className="mt-4 px-4 text-xs font-bold uppercase tracking-widest text-emerald">
                  Kategoriyalar
                </p>
                {categories.map((category) => {
                  const Icon = categoryIcon(category.icon)
                  return (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition hover:bg-white/[0.06]"
                    >
                      <Icon className="h-4 w-4 text-emerald" />
                      {category.nameUz || category.name}
                    </Link>
                  )
                })}
                <div className="mt-4 flex flex-wrap gap-2 px-4">
                  {isAuthenticated ? (
                    <>
                      <Button size="sm" asChild>
                        <Link href="/profile">Profilim</Link>
                      </Button>
                      <Button size="sm" variant="secondary" onClick={logout}>
                        Chiqish
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" asChild>
                        <Link href="/login">Kirish</Link>
                      </Button>
                      <Button size="sm" variant="secondary" asChild>
                        <Link href="/register">Ro'yxatdan o'tish</Link>
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
