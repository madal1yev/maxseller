import { useState } from 'react'
import { Bot, CheckCircle2, Info, Radio, Send, ShieldCheck, XCircle } from 'lucide-react'
import { api } from '../shared/api'
import type { TelegramStatus } from '../shared/types'

interface Props {
  status: TelegramStatus | null
  onRefresh: () => Promise<void>
  notify: (message: string) => void
}

export default function Bots({ status, onRefresh, notify }: Props) {
  const [busy, setBusy] = useState(false)

  const test = async () => {
    setBusy(true)
    try {
      await api.telegramTest()
      notify('Test xabar yuborildi. Telegramni tekshiring.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xabar yuborilmadi')
    } finally {
      setBusy(false)
      await onRefresh()
    }
  }

  const cards = [
    { label: 'Admin bot', ok: Boolean(status?.adminBotConfigured), detail: '@maxsellermanager_bot', icon: ShieldCheck },
    { label: 'Mijoz bot', ok: Boolean(status?.customerBotConfigured), detail: '@maxsellershop_bot', icon: Bot },
    { label: 'Admin chat', ok: Boolean(status?.adminChatConnected), detail: status?.adminChatConnected ? `ID: ${status.adminChatId}` : 'Admin /start yubormagan', icon: Radio },
    { label: 'Ishlash rejimi', ok: Boolean(status?.mode), detail: status?.mode || '—', icon: Send },
  ]

  return (
    <>
      <div className="stat-grid">
        {cards.map(({ label, ok, detail, icon: Icon }) => (
          <div className="stat" key={label}>
            <div><div className="label">{label}</div><div className="value" style={{ fontSize: 16, color: ok ? 'var(--green)' : 'var(--muted)' }}>{ok ? <><CheckCircle2 size={15} style={{ display: 'inline', verticalAlign: 'middle' }} /> Tayyor</> : <><XCircle size={15} style={{ display: 'inline', verticalAlign: 'middle' }} /> Kutilmoqda</>}</div><div className="cell-sub">{detail}</div></div>
            <div className="ico"><Icon size={18} /></div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><h2>Telegram integratsiyasi</h2><p>Botlar faqat xabarnoma va yordam uchun. Buyurtmalar faqat veb-sayt orqali qabul qilinadi.</p></div>
          <button className="btn btn-sm" onClick={() => void test()} disabled={busy || !status?.adminChatConnected}><Send size={16} /> {busy ? 'Yuborilmoqda...' : 'Test xabar'}</button>
        </div>
        <div className="notice info-notice"><Info size={18} /><div><b>Buyurtma berish Telegram orqali amalga oshirilmaydi</b><span>Botlar buyurtma holati, to'lov tasdig'i va yordam xabarlari uchun ishlatiladi.</span></div></div>
        <div className="bot-steps">
          <div className="bot-step"><b>1</b><div><h3>Admin botni ulang</h3><p><b>@maxsellermanager_bot</b> ga <code>/start</code> yuboring. Siz @{status?.adminUsername || 'madaliyev_a'} ekanligingiz tasdiqlangach chat ID avtomatik saqlanadi va xabarnomalar shu chatga keladi.</p></div></div>
          <div className="bot-step"><b>2</b><div><h3>Mijoz botni sinab ko'ring</h3><p><b>@maxsellershop_bot</b> ga <code>/start</code> yuboring. Mijozlar buyurtma va to'lov holati bo'yicha xabarnoma hamda yordam oladi.</p></div></div>
          <div className="bot-step"><b>3</b><div><h3>Akkauntni bog'lash</h3><p>Mijoz kabinetdagi kodni botga yuborsa, xabarnomalar bog'langan akkauntga tegishli bo'ladi.</p></div></div>
        </div>
        <p className="help">Bot tokenlari faqat serverdagi <code>.env</code> faylida. Ular frontendga, API javoblariga va loglarga chiqmaydi.</p>
      </div>
    </>
  )
}
