'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@maxseller/shared'
import type { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, Phone, Sparkles, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/providers'
import { useToast } from '@/components/ui/toast'
import { registerUser } from '@/lib/api-queries'

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, refresh } = useAuth()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = React.useState(false)
  const next = searchParams.get('next') || '/profile'

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  })

  const onSubmit = async (values: RegisterValues) => {
    try {
      const { token, user } = await registerUser(values)
      login(token, user)
      await refresh()
      toast({ title: 'Ro\'yxatdan o\'tdingiz', description: `Xush kelibsiz, ${user.name}!`, variant: 'success' })
      router.replace(next.startsWith('/') ? next : '/profile')
    } catch (error) {
      toast({
        title: 'Ro\'yxatdan o\'tib bo\'lmadi',
        description: error instanceof Error ? error.message : 'Ma\'lumotlarni tekshiring.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="container-page flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
            <Sparkles className="h-6 w-6" />
          </span>
          <h1 className="text-3xl font-extrabold">Ro'yxatdan o'tish</h1>
          <p className="mt-2 text-sm text-muted">
            MaxSeller akkaunti bilan xaridlaringizni kuzatib boring.
          </p>
        </div>

        <div className="panel p-6 sm:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="name" className="mb-2 block">Ism</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="name" placeholder="Ismingiz" className="pl-9" {...form.register('name')} />
              </div>
              {form.formState.errors.name ? (
                <p className="mt-1 text-xs text-red-400">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="email" className="mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="email" type="email" autoComplete="email" placeholder="name@example.com" className="pl-9" {...form.register('email')} />
              </div>
              {form.formState.errors.email ? (
                <p className="mt-1 text-xs text-red-400">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="phone" className="mb-2 block">Telefon (ixtiyoriy)</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="phone" type="tel" placeholder="+998 90 123 45 67" className="pl-9" {...form.register('phone')} />
              </div>
              {form.formState.errors.phone ? (
                <p className="mt-1 text-xs text-red-400">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block">Parol</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Kamida 8 belgi"
                  className="pl-9 pr-11"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-emerald"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="mt-1 text-xs text-red-400">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Yaratilmoqda...</>
              ) : (
                <>Ro'yxatdan o'tish <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Allaqachon akkauntingiz bormi?{' '}
            <Link href="/login" className="font-bold text-emerald hover:underline">Kiring</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
