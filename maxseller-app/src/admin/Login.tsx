import { useState, type FormEvent } from 'react'
import { KeyRound, LockKeyhole } from 'lucide-react'

export default function Login({ onLogin }: { onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish muvaffaqiyatsiz')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" width={34} height={34} />
          <span>Max<b>Seller</b></span>
        </a>
        <h1>Admin panel</h1>
        <p className="sub">Mahsulotlarni boshqaring — o'zgarishlar do'konda darhol paydo bo'ladi.</p>

        <div className="field">
          <label htmlFor="password">Parol</label>
          <div style={{ position: 'relative' }}>
            <LockKeyhole size={17} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--muted)' }} />
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolingizni kiriting"
              style={{ paddingLeft: 42 }}
              autoFocus
              required
            />
          </div>
        </div>

        <button className="btn" type="submit" disabled={busy}>
          <KeyRound size={17} /> {busy ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>

        {error && <p className="error">{error}</p>}

        <div className="login-hint">
          Agar <code>ADMIN_PASSWORD</code> o'zgartirilmagan bo'lsa, parol: <b>admin123</b>. Keyinchalik <b>Sozlamalar → Parol</b> bo'limida yangilashingiz mumkin.
        </div>
      </form>
    </div>
  )
}
