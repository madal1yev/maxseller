'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { adminLoginSchema } from '@maxseller/shared'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminAuth, useToast } from '@/components/providers'
import { errorMessage } from '@/lib/utils'

type LoginValues = z.infer<typeof adminLoginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, authLoading } = useAdminAuth()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: 'admin@maxseller.uz', password: '' },
  })

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/')
  }, [authLoading, isAuthenticated, router])

  async function onSubmit(values: LoginValues) {
    setSubmitting(true)
    try {
      await login(values.email, values.password)
      toast({ title: 'Xush kelibsiz!', description: 'Boshqaruv paneliga kirdingiz.', variant: 'success' })
      router.replace('/')
    } catch (error) {
      toast({
        title: 'Kirish muvaffaqiyatsiz',
        description: errorMessage(error),
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 bg-page-glow p-4">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[560px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[110px]" />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-900/80 shadow-glow-lg lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-brand-fade p-10 lg:flex">
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full border border-brand-500/20" />
          <div className="absolute -bottom-10 left-14 h-40 w-40 rounded-full border border-brand-500/10" />
          <div className="relative">
            <div className="mb-10 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 font-display text-sm font-bold text-ink-950 shadow-glow">
                M
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-white">MaxSeller</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-400">Admin Panel</p>
              </div>
            </div>
            <h1 className="max-w-sm font-display text-3xl font-semibold leading-tight text-white">
              Do\'koningizni{' '}
              <span className="heading-gradient">bir joydan</span> boshqaring.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#93aa9c]">
              Mahsulotlar, buyurtmalar, to\'lovlarni tasdiqlash va mijozlar bilan ishlash uchun yagona markaz.
            </p>
          </div>
          <div className="relative space-y-3">
            {[
              { icon: ShieldCheck, text: 'Xavfsiz autentifikatsiya' },
              { icon: Sparkles, text: 'Real vaqtli ma\'lumotlar' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-xs font-medium text-[#a8c0b2]">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-400">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold text-white">Admin kirish</h2>
            <p className="mt-2 text-sm text-[#8ba397]">Hisobingizga kirish uchun ma\'lumotlaringizni kiriting.</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f998b]" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="pl-10"
                  placeholder="admin@maxseller.uz"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email && (
                <p className="mt-1.5 text-xs text-red-300">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Parol</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f998b]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="px-10"
                  placeholder="Parolingiz"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f998b] transition hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="mt-1.5 text-xs text-red-300">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Kirilmoqda...' : 'Kirish'}
            </Button>
          </form>

          <p className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-center text-xs text-[#7f998b]">
            Faqat administratorlar kirishi mumkin. To\'lovlarni tasdiqlashdan oldin haqiqiy o\'tishni mustaqil tekshiring.
          </p>
        </div>
      </div>
    </div>
  )
}
