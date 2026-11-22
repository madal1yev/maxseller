import { ArrowLeft, Check, ShoppingCart, Zap } from 'lucide-react'
import { money } from '../shared/api'
import { categoryKey, useI18n } from '../shared/i18n'
import { ICONS, type Product, type Settings } from '../shared/types'
import { go } from './router'
import { EmptyState, PageHead } from './ui'

interface Props {
  product?: Product
  settings: Settings
  loading: boolean
  onAdd: (product: Product, buyNow?: boolean) => void
}

export default function ProductPage({ product, settings, loading, onAdd }: Props) {
  const { t } = useI18n()
  if (loading) return <div className="store-page"><div className="empty-state">{t('product.loading')}</div></div>
  if (!product) return (
    <div className="store-page">
      <EmptyState title={t('product.notFound')} text={t('product.notFoundText')}>
        <button className="btn btn-sm" onClick={() => go('/catalog')}>{t('common.backToCatalog')}</button>
      </EmptyState>
    </div>
  )

  return (
    <div className="store-page">
      <button className="back-link" onClick={() => go('/catalog')}><ArrowLeft size={16} /> {t('common.backToCatalog')}</button>
      <div className="product-detail">
        <div className="product-media">
          {product.image ? (
            <img src={product.image} alt={product.title} />
          ) : (
            <span className="fallback-icon" dangerouslySetInnerHTML={{ __html: ICONS[product.cat] }} />
          )}
          {product.tag && <span className="tag">{product.tag}</span>}
        </div>
        <div className="product-info">
          <PageHead eyebrow={t(categoryKey(product.cat))} title={product.title} text={product.desc} />
          <div className="detail-price">
            {product.oldPrice > product.price && <span className="old-price">{money(product.oldPrice)}</span>}
            <strong>{money(product.price)}</strong> <span>{settings.currency}</span>
          </div>
          <ul className="check-list">
            <li><Check size={16} /> {t('product.fileAfterPayment')}</li>
            <li><Check size={16} /> {t('product.trackStatus')}</li>
            <li><Check size={16} /> {t('product.botNotice')}</li>
          </ul>
          <div className="detail-actions">
            <button className="btn" onClick={() => onAdd(product, true)}><Zap size={17} /> {t('catalog.buyNow')}</button>
            <button className="btn btn-ghost" onClick={() => onAdd(product)}><ShoppingCart size={17} /> {t('catalog.addCart')}</button>
          </div>
          <p className="help">{t('product.customPrefix')} <button className="link-button" onClick={() => go('/checkout?mode=custom')}>{t('product.customLink')}</button> {t('product.customSuffix')}</p>
        </div>
      </div>
    </div>
  )
}
