import { useMemo } from 'react'
import { Eye, ShoppingCart, Zap } from 'lucide-react'
import { money } from '../shared/api'
import { categoryKey, useI18n } from '../shared/i18n'
import { CATEGORIES, ICONS, type CategoryId, type Product, type Settings } from '../shared/types'
import { go } from './router'
import { EmptyState } from './ui'

type Filter = 'all' | CategoryId

interface Props {
  products: Product[]
  settings: Settings
  cat: Filter
  q: string
  loading: boolean
  onCat: (cat: Filter) => void
  onQ: (q: string) => void
  onAdd: (product: Product, buyNow?: boolean) => void
}

export default function Catalog({ products, settings, cat, q, loading, onCat, onQ, onAdd }: Props) {
  const { lang, t } = useI18n()
  const list = useMemo(() => {
    const query = q.trim().toLocaleLowerCase(lang)
    return products.filter((p) => {
      const okCat = cat === 'all' || p.cat === cat
      const okQ = !query || `${p.title} ${p.desc}`.toLocaleLowerCase(lang).includes(query)
      return okCat && okQ
    })
  }, [products, cat, q, lang])

  const tabs: { id: Filter; name: string }[] = [
    { id: 'all', name: t('common.all') },
    ...CATEGORIES.map((c) => ({ id: c.id as Filter, name: t(categoryKey(c.id)) })),
  ]

  return (
    <section className="section" id="katalog">
      <div className="section-head">
        <h2>{t('common.catalog')}</h2>
        <p>{lang === 'uz' ? settings.catalogText : t('catalog.text')}</p>
      </div>

      <div className="tools">
        <div className="tabs" role="tablist" aria-label={t('common.catalog')}>
          {tabs.map((tab) => (
            <button key={tab.id} className="tab" role="tab" aria-selected={cat === tab.id} onClick={() => onCat(tab.id)}>
              {tab.name}
            </button>
          ))}
        </div>
        <label className="search">
          <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder={t('catalog.search')} aria-label={t('catalog.search')} />
        </label>
      </div>

      {loading && products.length === 0 ? (
        <div className="grid" aria-busy="true">
          {[1, 2, 3, 4].map((i) => <div className="card skeleton-card" key={i}><div className="cover" /><div className="card-body"><span className="skeleton-line w60" /><span className="skeleton-line" /><span className="skeleton-line w80" /></div></div>)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title={t('catalog.emptyTitle')} text={t('catalog.emptyText')}>
          <button className="btn btn-sm" onClick={() => go('/checkout?mode=custom')}>{t('catalog.order')}</button>
        </EmptyState>
      ) : (
        <div className="grid" aria-live="polite">
          {list.map((p) => (
            <article className="card" key={p.id}>
              <button className="cover cover-button" onClick={() => go(`/product/${p.id}`)} aria-label={t('catalog.about', { title: p.title })}>
                {p.image ? (
                  <img className="cover-img" src={p.image} alt="" loading="lazy" />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: ICONS[p.cat] }} />
                )}
                {p.tag && <span className="tag">{p.tag}</span>}
              </button>
              <div className="card-body">
                <span className="card-cat">{t(categoryKey(p.cat))}</span>
                <button className="card-title-btn" onClick={() => go(`/product/${p.id}`)}><h3>{p.title}</h3></button>
                <p>{p.desc}</p>
                <div className="card-foot">
                  {p.price > 0 ? (
                    <span className="price">
                      {p.oldPrice > 0 && p.oldPrice > p.price && <span className="old-price">{money(p.oldPrice)}</span>}
                      {money(p.price)} <small>{settings.currency}</small>
                    </span>
                  ) : (
                    <span className="price ask">{t('catalog.askPrice')}</span>
                  )}
                </div>
                <div className="card-actions">
                  <button className="btn btn-sm" onClick={() => onAdd(p, true)}><Zap size={15} /> {t('catalog.buyNow')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onAdd(p)} title={t('catalog.addCart')}><ShoppingCart size={16} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => go(`/product/${p.id}`)} title={t('common.details')}><Eye size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
