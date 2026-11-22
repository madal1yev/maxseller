import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { api } from '../shared/api'
import { useI18n } from '../shared/i18n'
import { setOrderToken } from './cart'
import { go, orderPath } from './router'
import { PageHead } from './ui'

export default function Track() {
  const { t } = useI18n()
  const [number, setNumber] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api.trackOrder(number.trim(), token.trim())
      setOrderToken(result.order.id, token.trim())
      go(orderPath(result.order.id, token.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('track.notFound'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="store-page track-page">
      <PageHead eyebrow={t('track.eyebrow')} title={t('track.title')} text={t('track.text')} />
      <form className="panel track-form" onSubmit={submit}>
        <div className="form-grid">
          <div className="field"><label htmlFor="tr-number">{t('track.number')}</label><input id="tr-number" className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="MS-2026-00001" required /></div>
          <div className="field"><label htmlFor="tr-token">{t('track.token')}</label><input id="tr-token" className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder={t('track.tokenPlaceholder')} /></div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-sm" type="submit" disabled={busy}><Search size={16} /> {busy ? t('track.searching') : t('track.find')}</button>
      </form>
      <div className="notice info-notice">{t('track.loggedIn')} <button className="link-button" onClick={() => go('/cabinet')}>{t('track.myOrders')}</button></div>
    </div>
  )
}
