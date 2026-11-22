import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, describeApiError } from '../shared/api'
import { useI18n } from '../shared/i18n'
import type { AuthProviders, OtpRequestResult, User } from '../shared/types'
import { loadCart, type CartItem } from './cart'
import { go } from './router'
import { ErrorBox, Loading, PageHead } from './ui'

interface Props {
  mode: 'login' | 'register'
  token?: string
  onAuthenticated: (token: string, user: User, cart?: CartItem[]) => void
  notify: (message: string) => void
}

export default function Auth({ mode, onAuthenticated, notify }: Props) {
  const { t } = useI18n()
  const [providers, setProviders] = useState<AuthProviders | null>(null)
  const [providersError, setProvidersError] = useState('')
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [request, setRequest] = useState<OtpRequestResult | null>(null)
  const [resendLeft, setResendLeft] = useState(0)
  const [expiresLeft, setExpiresLeft] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const registerMode = mode === 'register'

  const loadProviders = useCallback(async () => {
    setProvidersError('')
    try {
      setProviders(await api.authProviders())
    } catch (err) {
      setProvidersError(describeApiError(err))
    }
  }, [])

  useEffect(() => { void loadProviders() }, [loadProviders])

  useEffect(() => {
    if (step !== 'verify') return
    const timer = window.setInterval(() => {
      setResendLeft((value) => Math.max(0, value - 1))
      setExpiresLeft((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step])

  const configured = providers?.email.configured
  const providerName = providers?.email.provider
  const unavailable = providers ? !configured : false

  const sendCode = async (resend = false) => {
    setError('')
    if (name.trim().length < 2) { setError(t('auth.enterName')); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.enterEmail')); return
    }
    if (unavailable) { setError(t('auth.unavailableText')); return }

    setBusy(true)
    try {
      const result = await api.otpRequest({
        channel: 'email',
        name: name.trim(),
        email: email.trim(),
        cart: loadCart(),
      })
      setRequest(result)
      setResendLeft(result.resendAfterSeconds)
      setExpiresLeft(result.expiresInSeconds)
      setStep('verify')
      setCode('')
      notify(resend ? t('auth.newCode') : t('auth.codeDelivered'))
    } catch (err) {
      setError(describeApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!request) { setError(t('auth.requestFirst')); return }
    if (code.trim().length < 4) { setError(t('auth.enterCode')); return }
    setBusy(true)
    try {
      const result = await api.otpVerify({
        requestId: request.requestId,
        code: code.replace(/\D/g, ''),
        name: name.trim(),
        cart: loadCart(),
      })
      if (result.token) {
        onAuthenticated(result.token, result.user, result.cart)
        notify(registerMode ? t('auth.created') : t('auth.welcome'))
        return
      }
      // verify_contact shape: contact confirmed without a new session (normally used in Cabinet).
      if (result.ok && result.user) {
        notify(t('auth.contactConfirmed'))
        go('/login')
        return
      }
      setError(t('auth.noSession'))
    } catch (err) {
      setError(describeApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const editContact = () => {
    setStep('request')
    setRequest(null)
    setError('')
    setCode('')
  }

  return (
    <div className="store-page auth-page">
      <PageHead
        eyebrow={registerMode ? t('auth.newAccount') : t('auth.signIn')}
        title={registerMode ? t('auth.createAccount') : t('auth.signInTitle')}
        text={t('auth.intro')}
      />

      {providersError && <ErrorBox message={providersError} onRetry={() => void loadProviders()} />}
      {!providers && !providersError && <Loading text={t('auth.methodsLoading')} />}

      {providers && (
        <form className="auth-card otp-card" onSubmit={verify}>
          <div className="otp-channels" role="tablist" aria-label={t('auth.emailChannel')}>
            <div className="otp-channel active" aria-current="true">
              <Mail size={17} /> {t('auth.emailChannel')}
              {configured && <CheckCircle2 size={14} className="ok-icon" />}
            </div>
          </div>

          {unavailable && (
            <div className="notice warn-notice">
              <ShieldCheck size={18} />
              <div><b>{t('auth.unavailableTitle')}</b><span>{t('auth.unavailableText')}</span></div>
            </div>
          )}

          {step === 'request' ? (
            <>
              <div className="field">
                <label htmlFor="otp-name">{t('auth.name')}</label>
                <input id="otp-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth.fullName')} autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="otp-email">{t('auth.emailAddress')}</label>
                <input id="otp-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" required />
              </div>
              {error && <p className="error">{error}</p>}
              <button className="btn" type="button" onClick={() => void sendCode()} disabled={busy || !configured}>
                <KeyRound size={17} /> {busy ? t('auth.sending') : t('auth.sendCode')}
              </button>
            </>
          ) : (
            <>
              <div className="otp-sent">
                <CheckCircle2 size={18} />
                <div>
                  <b>{t('auth.codeSent')}</b>
                  <span>{request?.destinationMasked || t('auth.toYourAddress')}{providerName ? ` · ${providerName}` : ''}</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="otp-code">{t('auth.code')}</label>
                <input
                  id="otp-code"
                  className="input otp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </div>
              {expiresLeft <= 0 && <div className="notice warn-notice"><span>{t('auth.codeExpired')}</span></div>}
              {error && <p className="error">{error}</p>}
              <button className="btn" type="submit" disabled={busy}>
                <ShieldCheck size={17} /> {busy ? t('auth.checking') : t('auth.confirmLogin')}
              </button>
              <div className="otp-resend">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void sendCode(true)}
                  disabled={busy || resendLeft > 0}
                >
                  <RefreshCw size={14} /> {resendLeft > 0 ? t('auth.resendIn', { seconds: resendLeft }) : t('auth.resend')}
                </button>
                <button type="button" className="link-button muted" onClick={editContact}>
                  <ArrowLeft size={14} /> {t('auth.editContact')}
                </button>
              </div>
            </>
          )}

          <div className="auth-switch">
            {registerMode ? (
              <>{t('auth.haveAccount')} <button type="button" className="link-button" onClick={() => go('/login')}>{t('common.login')}</button></>
            ) : (
              <>{t('auth.noAccount')} <button type="button" className="link-button" onClick={() => go('/register')}>{t('common.register')}</button></>
            )}
          </div>
          <p className="help"><ShieldCheck size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('auth.help')}</p>
        </form>
      )}
    </div>
  )
}
