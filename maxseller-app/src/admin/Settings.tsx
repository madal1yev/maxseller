import { useEffect, useState } from 'react'
import { Bot, Check, ExternalLink, KeyRound, Save } from 'lucide-react'
import { api } from '../shared/api'
import type { Settings as SettingsType } from '../shared/types'

interface Props {
  settings: SettingsType
  onSaved: (settings: SettingsType) => void
  onBots: () => void
  notify: (message: string) => void
}

export default function Settings({ settings, onSaved, onBots, notify }: Props) {
  const [form, setForm] = useState<SettingsType>(settings)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  useEffect(() => setForm(settings), [settings])

  const update = (key: keyof SettingsType, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const result = await api.saveSettings(form) as SettingsType
      onSaved(result)
      notify('Sozlamalar saqlandi — do\'konda ham yangilandi')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    setSavingPass(true)
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      notify('Parol o\'zgartirildi')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xatolik')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div><h2>Ijtimoiy havolalar va matnlar</h2><p>Bu yerda o'zgartirgan hamma narsa do'kon sahifasida avtomatik yangilanadi.</p></div>
        </div>
        <div className="settings-row">
          <div className="field"><label htmlFor="s-tg">Telegram kanal username</label><input id="s-tg" className="input" value={form.telegramChannel} onChange={(e) => update('telegramChannel', e.target.value)} placeholder="maxseller_uz" /></div>
          <div className="field"><label htmlFor="s-ig">Instagram username</label><input id="s-ig" className="input" value={form.instagram} onChange={(e) => update('instagram', e.target.value)} placeholder="maxseller_uz" /></div>
          <div className="field"><label htmlFor="s-cur">Narx birligi</label><input id="s-cur" className="input" value={form.currency} onChange={(e) => update('currency', e.target.value)} placeholder="so'm" /></div>
        </div>
        <div className="divider" />
        <div className="settings-row">
          <div className="field"><label htmlFor="s-accent">Hero sarlavha qismi (yashil)</label><input id="s-accent" className="input" value={form.heroAccent} onChange={(e) => update('heroAccent', e.target.value)} placeholder="bir joyda!" /></div>
          <div className="field"><label htmlFor="s-final">Yakuniy CTA sarlavhasi</label><input id="s-final" className="input" value={form.finalTitle} onChange={(e) => update('finalTitle', e.target.value)} /></div>
          <div className="field span-2"><label htmlFor="s-lead">Hero tavsifi</label><textarea id="s-lead" className="textarea" value={form.heroLead} onChange={(e) => update('heroLead', e.target.value)} /></div>
          <div className="field span-2"><label htmlFor="s-cat">Katalog tavsifi</label><textarea id="s-cat" className="textarea" style={{ minHeight: 72 }} value={form.catalogText} onChange={(e) => update('catalogText', e.target.value)} /></div>
          <div className="field span-2"><label htmlFor="s-finaltext">Yakuniy CTA matni</label><textarea id="s-finaltext" className="textarea" style={{ minHeight: 72 }} value={form.finalText} onChange={(e) => update('finalText', e.target.value)} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sm" onClick={() => void save()} disabled={saving}><Save size={16} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h2>Parolni o'zgartirish</h2><p>Admin panelga kirish uchun ishlatiladi.</p></div></div>
        <div className="settings-row" style={{ maxWidth: 640 }}>
          <div className="field"><label htmlFor="p-current">Joriy parol</label><input id="p-current" className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Joriy parol" /></div>
          <div className="field"><label htmlFor="p-next">Yangi parol</label><input id="p-next" className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Kamida 4 belgi" /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={() => void changePassword()} disabled={savingPass}><KeyRound size={16} /> {savingPass ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h2>Sayt manzillari</h2><p>Do'kon va admin panel bir serverda ishlaydi.</p></div></div>
        <div style={{ display: 'grid', gap: 12 }}>
          <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener noreferrer" style={{ justifyContent: 'space-between' }}>
            <span>🛒 Do'kon: <b>/</b></span><ExternalLink size={15} />
          </a>
          <a className="btn btn-ghost btn-sm" href="/admin.html" target="_blank" rel="noopener noreferrer" style={{ justifyContent: 'space-between' }}>
            <span>⚙️ Admin panel: <b>/admin.html</b></span><ExternalLink size={15} />
          </a>
          <button className="btn btn-ghost btn-sm" onClick={onBots} style={{ justifyContent: 'space-between' }}>
            <span>🤖 Telegram botlar holati</span><Bot size={15} />
          </button>
          <p className="help"><Check size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Mahsulot qo'shganingizda do'kon sahifasi SSE orqali darhol yangilanadi — qayta yuklash shart emas.</p>
        </div>
      </div>
    </>
  )
}
