import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Check, Download, Film, Play, RotateCcw, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { useI18n, type I18nKey } from '../shared/i18n'
import { go } from './router'

const SCENE_MS = 3800
const SCENES = [
  { image: '/images/cover-01.svg', shape: 'a' },
  { image: '/images/cover-05.svg', shape: 'b' },
  { image: '/images/cover-02.svg', shape: 'c' },
  { image: '/images/cover-11.svg', shape: 'd' },
  { image: '/images/cover-12.svg', shape: 'e' },
  { image: '/images/cover-06.svg', shape: 'f' },
] as const

const key = (value: string) => value as I18nKey

/* ------------------------- Web Audio sound kit ------------------------- */
type Sfx = {
  resume: () => void
  whoosh: () => void
  tick: () => void
  finish: () => void
  destroy: () => void
}

function createSfx(): Sfx | null {
  const Ctor = typeof window === 'undefined'
    ? undefined
    : window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null

  let ctx: AudioContext
  try { ctx = new Ctor() } catch { return null }
  const master = ctx.createGain()
  master.gain.value = 0.5
  master.connect(ctx.destination)

  const envelope = (gain: GainNode, at: number, peak: number, length: number) => {
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  }

  const tone = (freq: number, length: number, type: OscillatorType = 'sine', delay = 0, peak = 0.07) => {
    const at = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, at)
    envelope(gain, at, peak, length)
    osc.connect(gain).connect(master)
    osc.start(at)
    osc.stop(at + length + 0.05)
  }

  const whoosh = () => {
    const at = ctx.currentTime
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.45), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 0.9
    filter.frequency.setValueAtTime(240, at)
    filter.frequency.exponentialRampToValueAtTime(2800, at + 0.34)
    const gain = ctx.createGain()
    envelope(gain, at, 0.12, 0.42)
    source.connect(filter).connect(gain).connect(master)
    source.start(at)
    source.stop(at + 0.46)
    tone(180, 0.18, 'triangle', 0, 0.05)
  }

  const tick = () => {
    tone(660, 0.09, 'square', 0, 0.025)
    tone(990, 0.07, 'sine', 0.04, 0.02)
  }

  const finish = () => {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, 0.7, 'sine', i * 0.09, 0.06))
  }

  return {
    resume: () => { void ctx.resume() },
    whoosh,
    tick,
    finish,
    destroy: () => { void ctx.close().catch(() => undefined) },
  }
}

/* --------------------------- Promo section ---------------------------- */
export default function Promo() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [vertical, setVertical] = useState(false)
  const [scene, setScene] = useState(0)
  const [finished, setFinished] = useState(false)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)
  const sfxRef = useRef<Sfx | null>(null)

  useEffect(() => { mutedRef.current = muted }, [muted])

  useEffect(() => () => {
    sfxRef.current?.destroy()
    sfxRef.current = null
  }, [])

  const advance = useCallback(() => {
    if (scene >= SCENES.length - 1) {
      setFinished(true)
      if (!mutedRef.current) sfxRef.current?.finish()
      return
    }
    setScene((value) => value + 1)
    if (!mutedRef.current) sfxRef.current?.whoosh()
  }, [scene])

  useEffect(() => {
    if (!open || finished) return
    const timer = window.setTimeout(advance, SCENE_MS)
    return () => window.clearTimeout(timer)
  }, [advance, finished, open, scene])

  useEffect(() => {
    if (!open && !videoOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setVideoOpen(false)
      }
      if (event.key === 'ArrowRight' && open && !finished) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [advance, finished, open, videoOpen])

  const play = () => {
    if (!sfxRef.current) sfxRef.current = createSfx()
    sfxRef.current?.resume()
    setScene(0)
    setFinished(false)
    setOpen(true)
    if (!mutedRef.current) sfxRef.current?.whoosh()
  }

  const replay = () => {
    setScene(0)
    setFinished(false)
    if (!mutedRef.current) sfxRef.current?.whoosh()
  }

  const toCatalog = () => {
    setOpen(false)
    go('/catalog')
  }

  const toggleMute = () => {
    setMuted((value) => {
      const next = !value
      mutedRef.current = next
      if (!next) sfxRef.current?.tick()
      return next
    })
  }

  const active = SCENES[scene]
  const points = t(key(`promo.s${scene + 1}.points`)).split('·').map((item) => item.trim()).filter(Boolean)
  const progressStyle = { '--scene-ms': `${SCENE_MS}ms` } as CSSProperties

  return (
    <>
      <section className="promo" id="promo" aria-label={t('promo.kicker')}>
        <div className="promo-glow" aria-hidden="true" />
        <div className="promo-copy">
          <p className="chip promo-chip"><Sparkles size={14} /> {t('promo.kicker')}</p>
          <h2>{t('promo.title')}</h2>
          <p className="promo-lead">{t('promo.text')}</p>
          <div className="promo-actions">
            <button className="btn promo-play" type="button" onClick={play}>
              <span className="promo-play-icon"><Play size={18} fill="currentColor" /></span>
              {t('promo.play')}
            </button>
            <button className="promo-file" type="button" onClick={() => { setVertical(false); setVideoOpen(true) }}>
              <Film size={17} /> {t('promo.watchVideo')}
            </button>
            <button className="promo-file" type="button" onClick={() => { setVertical(true); setVideoOpen(true) }}>
              <Play size={17} /> {t('promo.watchVertical')}
            </button>
            <a className="promo-file promo-file-download" href="/reklama/maxseller-promo.mp4" download="maxseller-promo.mp4">
              <Download size={17} /> {t('promo.download')}
            </a>
            <span className="promo-meta"><i /> {t('promo.meta')}</span>
          </div>
          <div className="promo-badges">
            <span><Check size={14} /> {t('promo.badge1')}</span>
            <span><Check size={14} /> {t('promo.badge2')}</span>
            <span><Check size={14} /> {t('promo.badge3')}</span>
          </div>
          <div className="promo-qa">
            <b>{t('promo.qaTitle')}</b>
            <div>
              <span>{t('promo.q1')}</span>
              <span>{t('promo.q2')}</span>
              <span>{t('promo.q3')}</span>
            </div>
          </div>
        </div>

        <div className="promo-reel" aria-hidden="true">
          <div className="promo-ring" />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div className={`promo-frame promo-frame-${index}`} key={index} style={{ animationDelay: `${index * -0.55}s` }}>
              <img src={SCENES[index].image} alt="" loading="lazy" />
            </div>
          ))}
          <div className="promo-scan" />
          <div className="promo-cursor"><span>PLAY</span></div>
        </div>
      </section>

      {open && (
        <div className="promo-overlay" role="dialog" aria-modal="true" aria-label={t('promo.play')}>
          <div className="promo-overlay-bg" aria-hidden="true" />
          <header className="promo-topbar">
            <span className="promo-brand"><img src="/favicon.svg" alt="" width={26} height={26} /> Max<b>Seller</b></span>
            <span className="promo-live"><i /> {t('promo.kicker')}</span>
            <div className="promo-tools">
              <button type="button" onClick={toggleMute} aria-label={muted ? t('promo.unmute') : t('promo.mute')} title={muted ? t('promo.unmute') : t('promo.mute')}>
                {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('promo.close')} title={t('promo.close')}>
                <X size={20} />
              </button>
            </div>
          </header>

          <div className={`promo-stage promo-shape-${active.shape}`} key={scene}>
            <div className="promo-scene-copy">
              <p className="promo-scene-tag">{t(key(`promo.s${scene + 1}.tag`))}</p>
              <h3>{t(key(`promo.s${scene + 1}.title`))}</h3>
              <p className="promo-scene-text">{t(key(`promo.s${scene + 1}.text`))}</p>
              <ul className="promo-points">
                {points.map((point) => <li key={point}><Check size={15} /> {point}</li>)}
              </ul>
            </div>
            <div className="promo-scene-shot">
              <div className="promo-shot-frame"><img src={active.image} alt="" /></div>
              <span className="promo-shot-tag">MS / 0{scene + 1}</span>
            </div>
          </div>

          <footer className="promo-bottom">
            <div className="promo-progress" key={`p-${scene}`}>
              {SCENES.map((item, index) => (
                <span key={item.image} className={index <= scene ? 'on' : ''}>
                  <i className={index === scene && !finished ? 'active' : undefined} style={index === scene && !finished ? progressStyle : undefined} />
                </span>
              ))}
            </div>
            <div className="promo-bottom-row">
              <span className="promo-count">0{scene + 1} / 0{SCENES.length}</span>
              <span className="promo-watermark">{t('promo.watermark')}</span>
              {finished ? (
                <div className="promo-final-actions">
                  <button type="button" className="btn btn-ghost" onClick={replay}><RotateCcw size={16} /> {t('promo.replay')}</button>
                  <a className="btn btn-ghost" href="/reklama/maxseller-promo.mp4" download="maxseller-promo.mp4"><Download size={16} /> {t('promo.download')}</a>
                  <button type="button" className="btn" onClick={toCatalog}>{t('promo.cta')} <ArrowRight size={16} /></button>
                </div>
              ) : (
                <button type="button" className="promo-skip" onClick={advance}>{t('promo.skip')} <ArrowRight size={15} /></button>
              )}
            </div>
          </footer>
        </div>
      )}

      {videoOpen && (
        <div className="promo-overlay promo-video-overlay" role="dialog" aria-modal="true" aria-label={t('promo.watchVideo')}>
          <div className="promo-overlay-bg" aria-hidden="true" />
          <header className="promo-topbar">
            <span className="promo-brand"><img src="/favicon.svg" alt="" width={26} height={26} /> Max<b>Seller</b></span>
            <span className="promo-live"><i /> {t('promo.meta')}</span>
            <div className="promo-tools">
              <button type="button" onClick={() => setVideoOpen(false)} aria-label={t('promo.close')} title={t('promo.close')}>
                <X size={20} />
              </button>
            </div>
          </header>
          <div className="promo-video-wrap">
            <video
              className={vertical ? 'is-vertical' : undefined}
              src={vertical ? '/reklama/maxseller-commercial-9x16.mp4' : '/reklama/maxseller-promo.mp4'}
              poster={vertical ? '/reklama/maxseller-commercial-poster.jpg' : '/reklama/maxseller-promo-poster.jpg'}
              controls autoPlay playsInline preload="metadata"
            />
          </div>
          <footer className="promo-bottom promo-video-bottom">
            <a className="btn" href={vertical ? '/reklama/maxseller-commercial-9x16.mp4' : '/reklama/maxseller-promo.mp4'} download={vertical ? 'maxseller-commercial-9x16.mp4' : 'maxseller-promo.mp4'}>
              <Download size={16} /> {t('promo.download')}
            </a>
            <button type="button" className="promo-skip" onClick={() => { setVideoOpen(false); play() }}>
              <Sparkles size={15} /> {t('promo.play')}
            </button>
          </footer>
        </div>
      )}
    </>
  )
}
