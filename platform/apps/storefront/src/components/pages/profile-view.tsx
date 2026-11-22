'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate, profileSchema } from '@maxseller/shared'
import type { z } from 'zod'
import {
  Download,
  Heart,
  Loader2,
  Mail,
  Package,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/error-state'
import { useAuth } from '@/components/providers'
import { useToast } from '@/components/ui/toast'
import { getMe, queryKeys, updateProfile } from '@/lib/api-queries'

type ProfileValues = z.infer<typeof profileSchema>

const quickLinks = [
  { href: '/orders', label: 'Mening xaridlarim', icon: Package, description: 'Buyurtmalar holati' },
  { href: '/downloads', label: 'Yuklamalarim', icon: Download, description: 'Sotib olingan fayllar' },
  { href: '/favorites', label: 'Sevimlilarim', icon: Heart, description: 'Saqlangan mahsulotlar' },
]

export function ProfileView() {
  const { refresh } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
  })

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', phone: '' },
  })

  React.useEffect(() => {
    if (data?.user) {
      form.reset({ name: data.user.name, phone: data.user.phone ?? '' })
    }
  }, [data, form])

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      toast({ title: 'Profil yangilandi', variant: 'success' })
      await queryClient.invalidateQueries({ queryKey: queryKeys.me })
      await refresh()
    },
    onError: (error: Error) => {
      toast({ title: 'Yangilab bo\'lmadi', description: error.message, variant: 'error' })
    },
  })

  const user = data?.user

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Profil</span>
      </nav>

      <h1 className="mb-2 text-3xl font-extrabold sm:text-4xl">Mening profilim</h1>
      <p className="mb-9 text-sm text-muted">Shaxsiy ma'lumotlaringizni ko'ring va yangilang.</p>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : isError || !user ? (
        <ErrorState
          message={isError ? "Profil ma'lumotlarini yuklab bo'lmadi." : 'Foydalanuvchi topilmadi.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="panel h-fit p-6 text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <UserRound className="h-7 w-7" />
              )}
            </span>
            <h2 className="text-xl font-extrabold">{user.name}</h2>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-left text-xs">
              <p className="flex items-center gap-2 text-muted">
                <Mail className="h-3.5 w-3.5 text-emerald" /> {user.email}
              </p>
              <p className="flex items-center gap-2 text-muted">
                <Phone className="h-3.5 w-3.5 text-emerald" /> {user.phone || 'Telefon kiritilmagan'}
              </p>
              <p className="flex items-center gap-2 text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald" /> {user.role}
              </p>
              <p className="flex items-center gap-2 text-muted">
                <UserRound className="h-3.5 w-3.5 text-emerald" /> {formatDate(user.createdAt)}
              </p>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="panel p-6">
              <h2 className="mb-5 text-lg font-bold">Ma'lumotlarni tahrirlash</h2>
              <form
                onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
                className="grid gap-5 sm:grid-cols-2"
              >
                <div>
                  <Label htmlFor="profile-name" className="mb-2 block">Ism</Label>
                  <Input id="profile-name" {...form.register('name')} />
                  {form.formState.errors.name ? (
                    <p className="mt-1 text-xs text-red-400">{form.formState.errors.name.message}</p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="profile-phone" className="mb-2 block">Telefon</Label>
                  <Input id="profile-phone" placeholder="+998 90 123 45 67" {...form.register('phone')} />
                  {form.formState.errors.phone ? (
                    <p className="mt-1 text-xs text-red-400">{form.formState.errors.phone.message}</p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saqlanmoqda...</>
                    ) : (
                      <><Save className="h-4 w-4" /> O'zgarishlarni saqlash</>
                    )}
                  </Button>
                </div>
              </form>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-2xl border border-white/10 bg-card/70 p-5 transition hover:border-emerald/50 hover:shadow-glow"
                >
                  <link.icon className="mb-4 h-5 w-5 text-emerald" />
                  <p className="text-sm font-bold transition group-hover:text-emerald">{link.label}</p>
                  <p className="mt-1 text-xs text-muted">{link.description}</p>
                </Link>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
