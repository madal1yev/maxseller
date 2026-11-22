'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { settingsSchema } from '@maxseller/shared'
import { CheckCircle2, KeyRound, Loader2, Save, ShieldCheck, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/providers'
import { useAdminSettings, useUpdateSettings } from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

interface SettingsFormValues {
  siteName: string
  slogan: string
  telegramChannel: string
  instagram: string
  email: string
  phone: string
  aboutText: string
  footerText: string
  currency: string
}

const emptyValues: SettingsFormValues = {
  siteName: '', slogan: '', telegramChannel: '', instagram: '', email: '', phone: '',
  aboutText: '', footerText: '', currency: "so'm",
}

export default function SettingsPage() {
  const { toast } = useToast()
  const settings = useAdminSettings()
  const updateSettings = useUpdateSettings()
  const resolver = zodResolver(settingsSchema) as unknown as Resolver<SettingsFormValues>
  const form = useForm<SettingsFormValues>({ resolver, defaultValues: emptyValues })
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (settings.data) {
      form.reset({
        siteName: settings.data.siteName ?? '',
        slogan: settings.data.slogan ?? '',
        telegramChannel: settings.data.telegramChannel ?? '',
        instagram: settings.data.instagram ?? '',
        email: settings.data.email ?? '',
        phone: settings.data.phone ?? '',
        aboutText: settings.data.aboutText ?? '',
        footerText: settings.data.footerText ?? '',
        currency: settings.data.currency ?? "so'm",
      })
    }
  }, [settings.data, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateSettings.mutateAsync({ ...values })
      setSavedAt(new Date().toLocaleString('uz-UZ'))
      form.reset({
        siteName: updated.siteName ?? '',
        slogan: updated.slogan ?? '',
        telegramChannel: updated.telegramChannel ?? '',
        instagram: updated.instagram ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
        aboutText: updated.aboutText ?? '',
        footerText: updated.footerText ?? '',
        currency: updated.currency ?? "so'm",
      })
      toast({ title: 'Sozlamalar saqlandi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Saqlab bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  })

  // Holat backend tomonidan hisoblanadi: hech qanday maxfiy kalit frontendga chiqmaydi.
  const integrationStatus = (settings.data as unknown as { integrations?: Record<string, boolean | string> })?.integrations ?? {}
  const integrations = [
    {
      name: 'SMS xizmati',
      description: 'Yangi to\'lov tekshiruvi haqida admin SMS xabarnomalari',
      configured: Boolean(integrationStatus.smsConfigured),
    },
    {
      name: 'Telegram bot',
      description: 'Xabarnoma boti (@maxseller_uz kanali emas)',
      configured: Boolean(integrationStatus.telegramConfigured),
    },
    {
      name: 'Click',
      description: 'Rasmiy Click merchant integratsiyasi',
      configured: Boolean(integrationStatus.clickConfigured),
    },
    {
      name: 'Payme',
      description: 'Rasmiy Payme merchant integratsiyasi',
      configured: Boolean(integrationStatus.paymeConfigured),
    },
  ]

  if (settings.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[560px] rounded-2xl" />
      </div>
    )
  }

  if (settings.isError || !settings.data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-red-300">Sozlamalar yuklanmadi: {errorMessage(settings.error)}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void settings.refetch()}>Qayta urinish</Button>
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        title="Sozlamalar"
        description="Sayt ma'lumotlari va integratsiya holatlari."
        actions={
          savedAt ? <Badge variant="success">Oxirgi saqlash: {savedAt}</Badge> : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Sayt sozlamalari</CardTitle>
            <p className="text-xs text-[#8ba397]">Bu ma'lumotlar do'kon saytida ko'rsatiladi.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="siteName">Sayt nomi</Label>
                  <Input id="siteName" {...form.register('siteName')} />
                </div>
                <div>
                  <Label htmlFor="currency">Valyuta</Label>
                  <Input id="currency" {...form.register('currency')} />
                </div>
              </div>
              <div>
                <Label htmlFor="slogan">Shior</Label>
                <Input id="slogan" {...form.register('slogan')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                  {form.formState.errors.email && <p className="mt-1 text-xs text-red-300">{form.formState.errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" {...form.register('phone')} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="telegramChannel">Telegram kanali</Label>
                  <Input id="telegramChannel" {...form.register('telegramChannel')} placeholder="@maxseller" />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" {...form.register('instagram')} />
                </div>
              </div>
              <div>
                <Label htmlFor="aboutText">Haqimizda</Label>
                <Textarea id="aboutText" rows={5} {...form.register('aboutText')} />
              </div>
              <div>
                <Label htmlFor="footerText">Footer matni</Label>
                <Textarea id="footerText" rows={3} {...form.register('footerText')} />
              </div>
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Saqlash
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-400" /> Integratsiya holati</CardTitle>
              <p className="text-xs leading-relaxed text-[#8ba397]">
                Faqat sozlanganlik holati ko'rsatiladi. API kalitlari va maxfiy ma'lumotlar hech qachon admin panelga chiqarilmaydi.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrations.map((item) => (
                <div key={item.name} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.configured ? 'bg-brand-500/15 text-brand-400' : 'bg-white/[0.05] text-[#7f998b]'}`}>
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <Badge variant={item.configured ? 'success' : 'secondary'} className="gap-1">
                        {item.configured ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {item.configured ? 'Sozlangan' : 'Sozlanmagan'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#7f998b]">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-white">Xavfsizlik eslatmasi</p>
            <p className="mt-2 text-xs leading-relaxed text-[#8ba397]">
              To'lovlarni faqat bank yoki to'lov tizimida pul kelganligini mustaqil tasdiqlagandan keyin qabul qiling.
              Chek yuklash avtomatik tasdiqlash hisoblanmaydi.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
