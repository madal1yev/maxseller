import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, Download, Globe, LayoutGrid,
  LogIn, LogOut, Moon, MousePointerClick, ReceiptText, ShoppingBag, ShoppingCart, Sun, UserRound,
} from 'lucide-react'
import {
  categoryKey, LANGUAGES, useI18n, type I18nKey,
} from '../shared/i18n'
import { CATEGORIES, ICONS, type CategoryId, type Settings, type User } from '../shared/types'
import { go } from './router'

const tg = (username: string) => `https://t.me/${username}`
const ig = (username: string) => `https://instagram.com/${username}`

const icon = (html: string) => ({ __html: html })

interface NavProps {
  settings: Settings
  user: User | null
  cartCount: number
  onCategory: (cat: CategoryId) => void
  onLogout: () => void
}

export function Nav({ settings, user, cartCount, onCategory, onLogout }: NavProps) {
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const { lang, setLang, theme, toggleTheme, t } = useI18n()

  useEffect(() => {
    if (!langOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!langRef.current?.contains(event.target as Node)) setLangOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLangOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [langOpen])

  const close = () => { setOpen(false); setLangOpen(false) }
  const category = (cat: CategoryId) => {
    close()
    onCategory(cat)
  }
  const link = (path: string) => {
    close()
    go(path)
  }

  return (
    <header className="nav" id="top">
      <div className="nav-inner">
        <a className="brand" href="#/" aria-label={t('nav.home')} onClick={close}>
          <span className="brand-mark"><img src="/favicon.svg" alt="" width={28} height={28} /></span>
          <span className="brand-copy">Max<b>Seller</b><small>DIGITAL STORE</small></span>
        </a>

        <nav className={`nav-links${open ? ' open' : ''}`} id="navLinks" aria-label={t('nav.menu')}>
          <a href="#katalog" onClick={close}>{t('common.catalog')}</a>
          <a href="#afzallik" onClick={close}>{t('nav.advantages')}</a>
          <a href="#qanday" onClick={close}>{t('nav.how')}</a>
          <a href="#savol" onClick={close}>{t('nav.faq')}</a>
          <a href="#/" onClick={(e) => { e.preventDefault(); category('web') }}>{t('nav.websites')}</a>
          <div className="nav-mobile-only nav-mobile-sep" aria-hidden="true" />
          <button className="nav-mobile-only" type="button" onClick={() => { toggleTheme(); close() }}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />} {t('nav.theme')}
          </button>
          {user ? (
            <button className="nav-mobile-only" type="button" onClick={() => { close(); onLogout() }}>
              <LogOut size={17} /> {t('nav.logout')}
            </button>
          ) : (
            <button className="nav-mobile-only" type="button" onClick={() => link('/login')}>
              <LogIn size={17} /> {t('common.login')}
            </button>
          )}
          <a className="nav-mobile-only" href={tg(settings.telegramChannel)} target="_blank" rel="noopener noreferrer" onClick={close}>
            <LayoutGrid size={17} /> {t('nav.channel')}
          </a>
        </nav>

        <div className="nav-actions">
          <div className="nav-action-group">
            <button className="nav-icon" onClick={() => link('/checkout')} aria-label={t('nav.cart', { count: cartCount })} title={t('nav.cartTitle')}>
              <ShoppingBag size={19} />
              {cartCount > 0 && <span className="nav-count">{cartCount}</span>}
            </button>

            <div className={`lang-picker${langOpen ? ' open' : ''}`} ref={langRef}>
              <button
                className="lang-trigger"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={t('nav.language')}
                onClick={() => setLangOpen((value) => !value)}
              >
                <Globe size={16} />
                <span>{lang.toUpperCase()}</span>
                <ChevronDown size={14} />
              </button>
              {langOpen && (
                <div className="lang-menu" role="listbox" aria-label={t('nav.language')}>
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={item.id === lang}
                      className={`lang-option${item.id === lang ? ' selected' : ''}`}
                      onClick={() => { setLang(item.id); setLangOpen(false) }}
                    >
                      <span className="lang-flag" aria-hidden="true">{item.flag}</span>
                      <span className="lang-copy"><b>{item.label}</b><small>{item.short}</small></span>
                      {item.id === lang && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="nav-icon theme-toggle" onClick={toggleTheme} aria-label={t('nav.theme')} title={t('nav.theme')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <span className="nav-divider" aria-hidden="true" />

          {user ? (
            <>
              <button className="btn btn-sm btn-ghost nav-user" onClick={() => link('/cabinet')} title={user.name}>
                <span className="nav-avatar"><UserRound size={15} /></span>
                <span className="nav-user-name">{user.name}</span>
              </button>
              <button className="nav-icon nav-logout" onClick={() => { close(); onLogout() }} aria-label={t('nav.logout')} title={t('nav.logout')}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="btn btn-sm nav-login" onClick={() => link('/login')}><LogIn size={16} /> {t('common.login')}</button>
          )}

          <a className="btn btn-sm btn-ghost nav-channel" href={tg(settings.telegramChannel)} target="_blank" rel="noopener noreferrer">
            <LayoutGrid size={15} /> {t('nav.channel')}
          </a>
        </div>

        <button
          className="burger"
          id="burger"
          aria-label={t('nav.burger')}
          aria-expanded={open}
          aria-controls="navLinks"
          onClick={() => setOpen(!open)}
        >
          <span /><span />
        </button>
      </div>
    </header>
  )
}

export function Hero({ settings }: { settings: Settings }) {
  const { lang, t } = useI18n()
  return (
    <section className="hero">
      <div className="hero-text">
        <p className="chip"><i /> {t('hero.chip')}</p>
        <h1>{t('hero.title')} <em>{lang === 'uz' ? settings.heroAccent : t('hero.accent')}</em></h1>
        <p className="lead">{lang === 'uz' ? settings.heroLead : t('hero.lead')}</p>
        <div className="cta-row">
          <a className="btn" href="#katalog">{t('hero.viewCatalog')}</a>
          <a className="btn btn-ghost" href={tg(settings.telegramChannel)} target="_blank" rel="noopener noreferrer">{t('hero.telegram')}</a>
          <a className="btn btn-ghost" href={ig(settings.instagram)} target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
        <p className="quality">{t('hero.quality')}</p>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="hero-window">
          <div className="hero-window-bar">
            <span className="hero-dots"><i /><i /><i /></span>
            <span>maxseller.uz / kabinet</span>
          </div>
          <div className="hero-window-body">
            <div className="hero-window-top"><span className="badge on">{t('hero.paid')}</span><b>#MS-2026-01024</b></div>
            <div className="hero-product">
              <span className="hero-product-icon"><ShoppingBag size={22} /></span>
              <div><b>{t('hero.demoProduct')}</b><small>{t('hero.demoMeta')}</small></div>
              <CheckCircle2 size={18} color="var(--green)" />
            </div>
            <div className="hero-progress"><span className="done" /><span className="done" /><span className="current" /><span /></div>
            <div className="hero-window-foot"><Download size={16} /> {t('hero.fileReady')} <small>{t('hero.available')}</small></div>
          </div>
        </div>
        <div className="float f1"><b>24/7</b><span>{t('hero.always')}</span></div>
        <div className="float f2"><b>{t('hero.fast')}</b><span>{t('hero.fastText')}</span></div>
      </div>
    </section>
  )
}

export function CategoryStrip({ onCategory }: { onCategory: (cat: CategoryId) => void }) {
  const { t } = useI18n()
  return (
    <section className="cats" aria-label={t('common.catalog')}>
      {CATEGORIES.map((cat) => (
        <button className="cat" key={cat.id} onClick={() => onCategory(cat.id)}>
          <span dangerouslySetInnerHTML={icon(ICONS[cat.id])} />
          <span>{t(categoryKey(cat.id))}<small>{cat.short}</small></span>
        </button>
      ))}
    </section>
  )
}

export function Features() {
  const { t } = useI18n()
  return (
    <section className="section" id="afzallik">
      <div className="section-head"><h2>{t('features.title')}</h2></div>
      <div className="features">
        <article className="feat big">
          <svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
          <h3>{t('features.fast.title')}</h3>
          <p>{t('features.fast.text')}</p>
        </article>
        <article className="feat">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" /></svg>
          <h3>{t('features.support.title')}</h3>
          <p>{t('features.support.text')}</p>
        </article>
        <article className="feat">
          <svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></svg>
          <h3>{t('features.quality.title')}</h3>
          <p>{t('features.quality.text')}</p>
        </article>
        <article className="feat">
          <svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2" /></svg>
          <h3>{t('features.easy.title')}</h3>
          <p>{t('features.easy.text')}</p>
        </article>
      </div>
    </section>
  )
}

export function Steps() {
  const { t } = useI18n()
  const steps = [1, 2, 3, 4] as const

  const screens = [
    <div className="mock mock-catalog" aria-hidden="true" key="catalog">
      <div className="mock-bar"><i /><i /><i /></div>
      <div className="mock-grid">
        {[0, 1, 2].map((item) => (
          <div className="mock-card" key={item}>
            <span className="mock-thumb"><ShoppingBag size={17} /></span>
            <i /><i className="short" />
          </div>
        ))}
      </div>
      <span className="mock-cursor"><MousePointerClick size={20} /></span>
    </div>,
    <div className="mock mock-checkout" aria-hidden="true" key="checkout">
      <div className="mock-bar"><i /><i /><i /></div>
      <div className="mock-checkout-row">
        <span className="mock-thumb small"><ShoppingCart size={14} /></span>
        <i /><i className="short" />
      </div>
      <div className="mock-fields"><i /><i className="short" /></div>
      <div className="mock-cta"><span /><Check size={14} /></div>
    </div>,
    <div className="mock mock-payment" aria-hidden="true" key="payment">
      <div className="mock-receipt">
        <ReceiptText size={34} />
        <i /><i className="short" /><i className="tiny" />
      </div>
      <span className="mock-verified"><Check size={17} /></span>
    </div>,
    <div className="mock mock-download" aria-hidden="true" key="download">
      <div className="mock-file"><Download size={28} /></div>
      <div className="mock-progress"><span /></div>
      <div className="mock-done"><CheckCircle2 size={18} /><i /></div>
    </div>,
  ]

  return (
    <section className="section guide-section" id="qanday">
      <div className="guide-head">
        <p className="chip"><i /> {t('steps.title')}</p>
        <h2>{t('steps.hint')}</h2>
      </div>
      <div className="guide-flow">
        {steps.map((step, index) => (
          <article className="guide-step" key={step}>
            <div className="guide-meta">
              <span className="guide-index">{String(step).padStart(2, '0')}</span>
              {index < steps.length - 1 && <span className="guide-line" aria-hidden="true"><ArrowRight size={15} /></span>}
            </div>
            <div className="guide-screen">{screens[index]}</div>
            <b className="guide-caption">{t(`steps.${step}.title` as I18nKey)}</b>
          </article>
        ))}
      </div>
      <a className="guide-cta" href="#katalog">{t('hero.viewCatalog')} <ArrowRight size={17} /></a>
    </section>
  )
}

export function Faq() {
  const { t } = useI18n()
  const questions = [1, 2, 3, 4] as const
  return (
    <section className="section" id="savol">
      <div className="section-head"><h2>{t('faq.title')}</h2></div>
      <div className="faq">
        {questions.map((item) => (
          <details key={item}>
            <summary>{t(`faq.q${item}` as I18nKey)}</summary>
            <p>{t(`faq.a${item}` as I18nKey)}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Final({ settings }: { settings: Settings }) {
  const { lang, t } = useI18n()
  return (
    <section className="final">
      <div>
        <h2>{lang === 'uz' ? settings.finalTitle : t('final.title')}</h2>
        <p>{lang === 'uz' ? settings.finalText : t('final.text')}</p>
      </div>
      <div className="final-actions">
        <a className="btn" href={tg(settings.telegramChannel)} target="_blank" rel="noopener noreferrer">@{settings.telegramChannel}</a>
        <a className="btn btn-ghost" href={ig(settings.instagram)} target="_blank" rel="noopener noreferrer">Instagram: {settings.instagram}</a>
      </div>
    </section>
  )
}

export function Footer({ live = false }: { live?: boolean }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const { t } = useI18n()
  useEffect(() => setYear(new Date().getFullYear()), [])
  return (
    <footer className="footer">
      <a className="brand" href="#top"><img src="/favicon.svg" alt="" width={28} height={28} /><span>Max<b>Seller</b></span></a>
      <p>{t('footer.text')}</p>
      {live && <p style={{ fontSize: 12 }}><span className="live-dot" />{t('footer.live')}</p>}
      <p className="copy">© {year} MaxSeller</p>
    </footer>
  )
}
