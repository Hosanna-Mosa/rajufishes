'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { acall, fromPaise, toPaise, uploadPhoto } from '@/lib/admin'
import { errText, Loading, Notice, PageHead } from '@/components/admin/ui'
import { GROUPS } from '@/lib/api'

type Img = { url: string; publicId?: string; alt?: string }
type Form = {
  name: string; category: 'fresh' | 'dry' | 'frozen'; group: string; unit: 'kg' | 'pack'; price: string; packWeightG: string
  stock: string; trackStock: boolean; description: string; note: string; active: boolean; caughtOn: string; addedOn: string
  weights: string; cuts: { name: string; delta: string }[]; images: Img[]
}
// dates are IST calendar days (YYYY-MM-DD); saved as noon IST of that day so no timezone can shift them
const IST_MS = 5.5 * 3600_000
function istToday() { return new Date(Date.now() + IST_MS).toISOString().slice(0, 10) }
const istDayOf = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + IST_MS).toISOString().slice(0, 10) : '')
const noonIst = (d: string) => `${d}T12:00:00+05:30`
const blank: Form = { name: '', category: 'fresh', group: 'Fresh fish', unit: 'kg', price: '', packWeightG: '', stock: '0', trackStock: true, description: '', note: '', active: true, caughtOn: istToday(), addedOn: istToday(), weights: '500, 1000, 2000', cuts: [{ name: 'Steaks', delta: '0' }], images: [] }

type Api = { _id: string; name: string; slug: string; category: Form['category']; group: string; unit: Form['unit']; price: number; packWeightG?: number; stock: number; trackStock: boolean; description?: string; note?: string; active: boolean; landedAt?: string | null; addedOn?: string | null; weights: number[]; cuts: { name: string; priceDeltaPerKg: number }[]; images: Img[] }
const fromApi = (p: Api): Form => ({
  name: p.name, category: p.category, group: p.group, unit: p.unit, price: fromPaise(p.price), packWeightG: p.packWeightG ? String(p.packWeightG) : '', stock: String(p.stock), trackStock: p.trackStock,
  description: p.description ?? '', note: p.note ?? '', active: p.active, caughtOn: istDayOf(p.landedAt), addedOn: istDayOf(p.addedOn), weights: p.weights.join(', '), cuts: p.cuts.map((c) => ({ name: c.name, delta: fromPaise(c.priceDeltaPerKg) })), images: p.images,
})

export default function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const router = useRouter()
  const [f, setF] = useState<Form | null>(isNew ? blank : null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  const [storage, setStorage] = useState<'local' | 'cloudinary' | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    acall<{ storage: 'local' | 'cloudinary' }>('/uploads/status').then((r) => setStorage(r.storage)).catch(() => {})
    if (new URLSearchParams(window.location.search).has('saved')) setMsg({ kind: 'ok', text: 'Product added. It is in the shop now.' })
    if (!isNew) acall<{ product: Api }>(`/products/${id}`).then((r) => setF(fromApi(r.product))).catch((e) => setMsg({ kind: 'bad', text: errText(e) }))
  }, [id, isNew])

  if (!f) return <Loading error={msg?.text} />
  const set = (patch: Partial<Form>) => { setMsg(null); setF({ ...f, ...patch }) }
  const setCategory = (category: Form['category']) => set({ category, unit: category === 'fresh' ? 'kg' : 'pack', group: category === 'fresh' ? 'Fresh fish' : category === 'dry' ? 'Dry fish' : 'Frozen packs' })

  function build() {
    const price = toPaise(f!.price)
    if (!f!.name.trim()) return 'Please give the product a name.'
    if (price === null) return 'Please enter the price as a number, like 450 or 450.50.'
    const stock = parseFloat(f!.stock)
    if (!/^\d{1,6}(\.\d{1,3})?$/.test(f!.stock.trim())) return 'Stock must be a number, like 12 or 7.5.'
    const weights = f!.unit === 'kg' ? f!.weights.split(/[ ,]+/).filter(Boolean).map(Number) : []
    if (f!.unit === 'kg' && (!weights.length || weights.some((w) => !Number.isInteger(w) || w < 1))) return 'Weights must be whole numbers in grams, like 500, 1000, 2000.'
    if (f!.unit === 'pack' && !/^\d{1,5}$/.test(f!.packWeightG.trim())) return 'Please enter the pack weight in grams, like 250.'
    const cuts = []
    for (const c of f!.cuts.filter((c) => c.name.trim())) {
      const d = c.delta.trim() === '' ? 0 : c.delta.trim().startsWith('-') ? -(toPaise(c.delta.trim().slice(1)) ?? NaN) : toPaise(c.delta)
      if (d === null || Number.isNaN(d)) return `The extra price for “${c.name}” must be a number.`
      cuts.push({ name: c.name.trim(), priceDeltaPerKg: d })
    }
    return { name: f!.name.trim(), category: f!.category, group: f!.group, unit: f!.unit, price, stock, trackStock: f!.trackStock, description: f!.description, note: f!.note, active: f!.active, ...(f!.category === 'fresh' ? { landedAt: f!.caughtOn ? noonIst(f!.caughtOn) : null } : {}), ...(f!.addedOn ? { addedOn: noonIst(f!.addedOn) } : {}), weights, cuts, images: f!.images, ...(f!.unit === 'pack' ? { packWeightG: Number(f!.packWeightG) } : {}) }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const body = build()
    if (typeof body === 'string') return setMsg({ kind: 'bad', text: body })
    setBusy(true); setMsg(null)
    try {
      if (isNew) { const r = await acall<{ product: { _id: string } }>('/products', { method: 'POST', body }); router.replace(`/admin/products/${r.product._id}?saved=1`) }
      else { await acall(`/products/${id}`, { method: 'PATCH', body }); setMsg({ kind: 'ok', text: 'Saved. The shop shows these changes now.' }) }
    } catch (x) { setMsg({ kind: 'bad', text: errText(x) }) }
    setBusy(false)
  }

  async function pick(files: FileList | null) {
    if (!files?.length) return
    setUp(true); setMsg(null)
    try {
      let imgs = f!.images
      for (const file of Array.from(files)) {
        if (imgs.length >= 5) throw new Error('A product can have up to 5 photos.')
        const r = await uploadPhoto(file)
        imgs = [...imgs, { url: r.url, publicId: r.publicId, alt: f!.name }]
      }
      setF({ ...f!, images: imgs })
    } catch (x) { setMsg({ kind: 'bad', text: x instanceof Error && !('status' in x) ? x.message : errText(x) }) }
    setUp(false)
    if (file.current) file.current.value = ''
  }

  return (
    <>
      <PageHead title={isNew ? 'Add a product' : f.name || 'Product'} sub={isNew ? 'Fill this in once. You can change prices later on the market board.' : undefined}>
        <Link href="/admin/products" className="btn line2">← All products</Link>
      </PageHead>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <form onSubmit={save} noValidate>
        <div className="rowsplit">
          <div className="main">
            <div className="a-card">
              <h2>About the product</h2>
              <div className="in fgrid">
                <div className="fld"><label htmlFor="n">Name</label><input id="n" className="field" value={f.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} /></div>
                <div className="fld h2"><label htmlFor="c">Type</label>
                  <select id="c" className="field" value={f.category} onChange={(e) => setCategory(e.target.value as Form['category'])}><option value="fresh">Fresh</option><option value="dry">Dry</option><option value="frozen">Frozen</option></select></div>
                <div className="fld h2"><label htmlFor="g">Shown under</label>
                  <select id="g" className="field" value={f.group} onChange={(e) => set({ group: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></div>
                <div className="fld"><label htmlFor="d">Description</label><textarea id="d" className="field" value={f.description} maxLength={2000} onChange={(e) => set({ description: e.target.value })} /></div>
                <div className="fld"><label htmlFor="no">Short note on the card (optional)</label><input id="no" className="field" maxLength={120} value={f.note} onChange={(e) => set({ note: e.target.value })} /><div className="hint">For example “Caught at dawn”.</div></div>
              </div>
            </div>
            <div className="a-card">
              <h2>Price and stock</h2>
              <div className="in fgrid">
                <div className="fld h3"><label htmlFor="u">Sold</label>
                  <select id="u" className="field" value={f.unit} onChange={(e) => set({ unit: e.target.value as Form['unit'] })}><option value="kg">By the kg</option><option value="pack">By the pack</option></select></div>
                <div className="fld h3"><label htmlFor="p">Price in ₹ {f.unit === 'kg' ? 'per kg' : 'per pack'}</label><input id="p" className="field" inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value })} /></div>
                <div className="fld h3"><label htmlFor="s">Stock ({f.unit === 'kg' ? 'kg' : 'packs'})</label><input id="s" className="field" inputMode="decimal" value={f.stock} onChange={(e) => set({ stock: e.target.value })} /></div>
                {f.unit === 'kg' ? (
                  <div className="fld"><label htmlFor="w">Weights customers can pick (grams, separated by commas)</label><input id="w" className="field" value={f.weights} onChange={(e) => set({ weights: e.target.value })} /><div className="hint">500, 1000, 2000 means ½ kg, 1 kg and 2 kg.</div></div>
                ) : (
                  <div className="fld h2"><label htmlFor="pw">Weight of one pack (grams)</label><input id="pw" className="field" inputMode="numeric" value={f.packWeightG} onChange={(e) => set({ packWeightG: e.target.value })} /></div>
                )}
                <label className="chk fld"><input type="checkbox" checked={f.trackStock} onChange={(e) => set({ trackStock: e.target.checked })} /> Count stock (turn off only if you never run out)</label>
              </div>
            </div>
            <div className="a-card">
              <h2>Cuts</h2>
              <div className="in">
                <p className="small" style={{ marginTop: 0 }}>Ways the customer can have it cut or cleaned. “Extra ₹ per kg” is added to the price (use 0 for no change).</p>
                {f.cuts.map((c, i) => (
                  <div key={i} className="fgrid" style={{ marginBottom: 10, alignItems: 'flex-end' }}>
                    <div className="fld h2"><label htmlFor={`cn${i}`}>Cut name</label><input id={`cn${i}`} className="field" value={c.name} maxLength={40} onChange={(e) => set({ cuts: f.cuts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} /></div>
                    <div className="fld h3"><label htmlFor={`cd${i}`}>Extra ₹ per kg</label><input id={`cd${i}`} className="field" inputMode="decimal" value={c.delta} onChange={(e) => set({ cuts: f.cuts.map((x, j) => (j === i ? { ...x, delta: e.target.value } : x)) })} /></div>
                    <button type="button" className="btn sm line2" onClick={() => set({ cuts: f.cuts.filter((_, j) => j !== i) })}>Remove</button>
                  </div>
                ))}
                {f.cuts.length < 10 && <button type="button" className="btn sm line2" onClick={() => set({ cuts: [...f.cuts, { name: '', delta: '0' }] })}>+ Add a cut</button>}
              </div>
            </div>
          </div>
          <div className="side">
            <div className="a-card">
              <h2>Photos</h2>
              <div className="in">
                {storage === 'local' && <div className="local-tag">TEST MODE: photos are saved on this computer, not on Cloudinary</div>}
                <div className="photos">
                  {f.images.map((im, i) => (
                    <div className="photo" key={im.url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.url} alt={im.alt || f.name} />
                      <button type="button" onClick={() => set({ images: f.images.filter((_, j) => j !== i) })}>Remove{i === 0 ? ' (main)' : ''}</button>
                    </div>
                  ))}
                  {f.images.length === 0 && <p className="small" style={{ margin: 0 }}>No photo yet. The shop shows a striped picture instead.</p>}
                </div>
                <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
                <div style={{ marginTop: 14 }}><button type="button" className="btn sm" disabled={up || f.images.length >= 5} onClick={() => file.current?.click()}>{up ? 'Uploading…' : '+ Add photos'}</button></div>
                <div className="hint">JPG, PNG or WebP, up to 6 MB each, 5 photos at most. The first one is the main photo.</div>
              </div>
            </div>
            <div className="a-card">
              <h2>Shop</h2>
              <div className="in fgrid">
                {f.category === 'fresh' ? (
                  <>
                    <div className="fld"><label htmlFor="caught">Caught on</label><input id="caught" type="date" className="field" value={f.caughtOn} onChange={(e) => set({ caughtOn: e.target.value })} /></div>
                    <div className="fld"><label htmlFor="added">Added on</label><input id="added" type="date" className="field" value={f.addedOn} onChange={(e) => set({ addedOn: e.target.value })} /></div>
                    <div className="hint fld" style={{ marginTop: -8 }}>Shown to customers as “Caught today, added today.” Leave “Caught on” empty to show nothing. Switching a product back on sets “Added on” to today.</div>
                  </>
                ) : null}
                <label className="chk fld"><input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> For sale in the shop</label>
                <div className="hint fld" style={{ marginTop: -8 }}>Switch off to hide it from the shop. Old orders keep working.</div>
                <button className="btn big" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Saving…' : isNew ? 'Add product' : 'Save product'}</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
