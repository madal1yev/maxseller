import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff, FileArchive, ImagePlus, PackageOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { api, fileToDataUrl, money } from '../shared/api'
import { CAT_SHORT, CATEGORIES, ICONS, type CategoryId, type Product } from '../shared/types'

type Filter = 'all' | CategoryId

interface FormState {
  title: string
  cat: CategoryId
  desc: string
  price: string
  oldPrice: string
  tag: string
  image: string
  active: boolean
}

const BLANK: FormState = {
  title: '', cat: 'web', desc: '', price: '', oldPrice: '', tag: '', image: '', active: true,
}

const toForm = (p: Product): FormState => ({
  title: p.title,
  cat: p.cat,
  desc: p.desc,
  price: String(p.price || ''),
  oldPrice: String(p.oldPrice || ''),
  tag: p.tag,
  image: p.image,
  active: p.active,
})

interface Props {
  products: Product[]
  addSignal: number
  onChanged: () => Promise<void>
  notify: (message: string) => void
}

export default function Products({ products, addSignal, onChanged, notify }: Props) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [form, setForm] = useState<FormState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageData, setImageData] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [fileBusy, setFileBusy] = useState(false)
  const prevSignal = useRef(addSignal)

  useEffect(() => {
    if (addSignal !== prevSignal.current) {
      prevSignal.current = addSignal
      setForm({ ...BLANK })
      setEditingId(null)
      setImageData('')
      setImagePreview('')
    }
  }, [addSignal])

  const list = useMemo(() => {
    const query = q.trim().toLocaleLowerCase('uz')
    return products.filter((p) => {
      const okCat = filter === 'all' || p.cat === filter
      const okQ = !query || `${p.title} ${p.desc}`.toLocaleLowerCase('uz').includes(query)
      return okCat && okQ
    })
  }, [products, q, filter])

  const openNew = () => {
    setForm({ ...BLANK })
    setEditingId(null)
    setImageData('')
    setImagePreview('')
  }

  const openEdit = (p: Product) => {
    setForm(toForm(p))
    setEditingId(p.id)
    setImageData('')
    setImagePreview(p.image || '')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    if (!form.title.trim()) {
      notify('Mahsulot nomini kiriting')
      return
    }
    setSaving(true)
    try {
      await api.saveProduct({
        ...(editingId ? { id: editingId } : {}),
        title: form.title.trim(),
        cat: form.cat,
        desc: form.desc.trim(),
        price: Number(form.price) || 0,
        oldPrice: Number(form.oldPrice) || 0,
        tag: form.tag.trim(),
        image: form.image.trim(),
        ...(imageData ? { imageData } : {}),
        active: form.active,
      }, !editingId)
      await onChanged()
      setForm(null)
      setImageData('')
      setImagePreview('')
      notify(editingId ? 'Mahsulot yangilandi — do\'konda ham paydo bo\'ldi' : 'Mahsulot do\'konga qo\'shildi')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (p: Product) => {
    try {
      await api.toggleProduct(p.id)
      await onChanged()
      notify(p.active ? 'Mahsulot do\'kondan yashirildi' : 'Mahsulot do\'konda paydo bo\'ldi')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xatolik')
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await api.deleteProduct(deleting.id)
      await onChanged()
      setDeleting(null)
      notify('Mahsulot o\'chirildi')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xatolik')
    }
  }

  const pickImage = async (file?: File) => {
    if (!file) return
    try {
      const data = await fileToDataUrl(file)
      setImageData(data)
      setImagePreview(data)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Rasm o\'qilmadi')
    }
  }

  const uploadFile = async (file?: File) => {
    if (!file || !editingId) return
    setFileBusy(true)
    try {
      const data = await fileToDataUrl(file)
      await api.uploadProductFile(editingId, data, file.name)
      await onChanged()
      notify('Mahsulot fayli yuklandi. Buyurtma bergan mijozga yuboriladi.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Fayl yuklanmadi')
    } finally {
      setFileBusy(false)
    }
  }

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div><h2>Mahsulotlar</h2><p>Qo'shgan yoki o'zgartirgan mahsulotingiz do'konda avtomatik paydo bo'ladi.</p></div>
          <button className="btn btn-sm" onClick={openNew}><Plus size={16} /> Yangi mahsulot</button>
        </div>

        <div className="toolbar">
          <label className="search">
            <Search size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom yoki tavsif bo'yicha qidirish" />
          </label>
          <button className="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Hammasi ({products.length})</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className="tab" aria-selected={filter === c.id} onClick={() => setFilter(c.id)}>{c.short}</button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Mahsulot</th><th>Kategoriya</th><th>Narx</th><th>Holat</th><th>So'rovlar</th><th>Harakatlar</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td data-label="Mahsulot">
                    <div className="product-cell">
                      <div className="thumb">
                        {p.image ? <img src={p.image} alt="" /> : <span dangerouslySetInnerHTML={{ __html: ICONS[p.cat] }} />}
                      </div>
                      <div>
                        <div className="cell-title">{p.title}</div>
                        <div className="cell-sub">{p.tag || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Kategoriya"><span className="badge cat">{CAT_SHORT[p.cat]}</span></td>
                  <td className="nowrap" data-label="Narx">{p.price > 0 ? `${money(p.price)} so'm` : <span className="muted">Narxini so'rang</span>}</td>
                  <td data-label="Holat"><span className={`badge ${p.active ? 'on' : 'off'}`}>{p.active ? 'Faol' : 'Yashirin'}</span></td>
                  <td data-label="So'rovlar"><b style={{ color: 'var(--green)' }}>{p.orders || 0}</b></td>
                  <td data-label="Harakatlar">
                    <div className="row-actions">
                      <button className="icon-btn" title={p.active ? 'Do\'kondan yashirish' : 'Do\'konda ko\'rsatish'} onClick={() => void toggle(p)}>
                        {p.active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button className="icon-btn" title="Tahrirlash" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                      <button className="icon-btn danger" title="O'chirish" onClick={() => setDeleting(p)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><PackageOpen /><p>Mahsulot topilmadi yoki hali qo'shilmagan.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setForm(null) }}>
          <form className="modal" onSubmit={submit}>
            <h2>{editingId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h2>
            <p className="modal-sub">Saqlaganingizdan keyin mahsulot darhol do'konda paydo bo'ladi.</p>

            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="f-title">Mahsulot nomi *</label>
                <input id="f-title" className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Masalan: Biznes landing page" autoFocus />
              </div>
              <div className="field">
                <label htmlFor="f-cat">Kategoriya</label>
                <select id="f-cat" className="select" value={form.cat} onChange={(e) => update('cat', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="f-tag">Yorliq (ixtiyoriy)</label>
                <input id="f-tag" className="input" value={form.tag} onChange={(e) => update('tag', e.target.value)} placeholder="Yangi yoki Hit" />
              </div>
              <div className="field span-2">
                <label htmlFor="f-desc">Qisqa tavsif</label>
                <textarea id="f-desc" className="textarea" value={form.desc} onChange={(e) => update('desc', e.target.value)} placeholder="Mahsulot haqida qisqacha..." />
              </div>
              <div className="field">
                <label htmlFor="f-price">Narx (so'm)</label>
                <input id="f-price" className="input" type="number" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="150000" />
                <span className="help">0 qo'ysangiz "Narxini so'rang" deb chiqadi</span>
              </div>
              <div className="field">
                <label htmlFor="f-old">Eski narx (ixtiyoriy)</label>
                <input id="f-old" className="input" type="number" min="0" value={form.oldPrice} onChange={(e) => update('oldPrice', e.target.value)} placeholder="200000" />
                <span className="help">Chegirma ko'rsatish uchun</span>
              </div>
              <div className="field span-2">
                <label>Mahsulot rasmi</label>
                <div className="image-uploader">
                  <div className="image-preview">
                    {imagePreview ? <img src={imagePreview} alt="Mahsulot rasmi" /> : <ImagePlus size={26} />}
                  </div>
                  <div className="image-upload-actions">
                    <label className="btn btn-ghost btn-sm upload-label">
                      <ImagePlus size={15} /> Rasm yuklash
                      <input type="file" accept="image/*" hidden onChange={(e) => void pickImage(e.target.files?.[0])} />
                    </label>
                    <input id="f-image" className="input" value={form.image} onChange={(e) => { update('image', e.target.value); if (!imageData) setImagePreview(e.target.value) }} placeholder="yoki rasm havolasi" />
                    <span className="help">Rasm yuklasangiz avtomatik saqlanadi. Bo'sh qolsa kategoriya ikonkasi chiqadi.</span>
                  </div>
                </div>
              </div>
              <div className="field span-2">
                <label>Mahsulot fayli (ZIP, PDF,video va h.k.)</label>
                <div className="inline-form">
                  <label className="upload-mini">
                    <FileArchive size={15} /> {fileBusy ? 'Yuklanmoqda...' : 'Fayl tanlash'}
                    <input type="file" hidden disabled={!editingId || fileBusy} onChange={(e) => void uploadFile(e.target.files?.[0])} />
                  </label>
                  <span className="help">{editingId ? (products.find((p) => p.id === editingId)?.fileName || 'Hali fayl biriktirilmagan') : 'Avval mahsulotni saqlang, keyin fayl biriktiring'}</span>
                </div>
              </div>
              <div className="span-2">
                <label className="switch-row">
                  <span className="switch">
                    <input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} />
                    <span />
                  </span>
                  <span className="switch-text"><b>Do'konda ko'rsatish</b><small>O'chirsangiz mahsulot yashirinadi, lekin o'chirilmaydi</small></span>
                </label>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(null)}><X size={16} /> Bekor qilish</button>
              <button type="submit" className="btn btn-sm" disabled={saving}><Check size={16} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            </div>
          </form>
        </div>
      )}

      {deleting && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleting(null) }}>
          <div className="modal" style={{ width: 'min(440px, 100%)' }}>
            <h2>Mahsulotni o'chirish?</h2>
            <p className="modal-sub">Bu amalni qaytarib bo'lmaydi.</p>
            <p className="confirm-text"><b>{deleting.title}</b> do'kondan butunlay o'chiriladi.</p>
            <div className="modal-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>Bekor qilish</button>
              <button className="btn btn-danger btn-sm" onClick={() => void remove()}><Trash2 size={16} /> O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
