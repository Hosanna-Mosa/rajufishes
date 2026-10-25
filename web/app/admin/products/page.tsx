'use client'
import Link from 'next/link'
import { useState } from 'react'
import { acall } from '@/lib/admin'
import { Loading, PageHead, Pill, useLoad } from '@/components/admin/ui'
import { CATEGORY_LABEL, priceText } from '@/lib/format'

type P = { _id: string; name: string; category: 'fresh' | 'dry' | 'frozen'; group: string; unit: 'kg' | 'pack'; price: number; stock: number; active: boolean; marketListed: boolean; images: { url: string }[] }

export default function Products() {
  const [q, setQ] = useState('')
  const [hidden, setHidden] = useState(false)
  const { data, error } = useLoad(() => acall<{ items: P[] }>(`/products?${new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), ...(hidden ? { active: 'false' } : {}) })}`), [q, hidden])
  return (
    <>
      <PageHead title="Products" sub="Everything the shop sells. To change today’s price or stock quickly, use the market board.">
        <Link href="/admin/products/new" className="btn yellow shadow">+ Add a product</Link>
      </PageHead>
      <div className="filters">
        <div className="fld grow"><label htmlFor="q">Search</label><input id="q" className="field" placeholder="Name of the product" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label className="chk"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Only products that are switched off</label>
      </div>
      {!data ? <Loading error={error} /> : (
        <div className="tblw">
          <table className="tbl stack">
            <thead><tr><th>Photo</th><th>Name</th><th>Type</th><th className="num">Price</th><th className="num">Stock</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id} className={p.active ? undefined : 'dim'}>
                  <td data-l="Photo" style={{ width: 70 }}>{p.images[0]?.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.images[0].url} alt="" width={56} height={44} style={{ objectFit: 'cover', border: '2px solid var(--ink)' }} /> : <span className="small">none</span>}</td>
                  <td data-l="Name"><Link className="rowlink" href={`/admin/products/${p._id}`}>{p.name}</Link><div className="small">{p.group}</div></td>
                  <td data-l="Type">{CATEGORY_LABEL[p.category]}</td>
                  <td data-l="Price" className="num">{priceText(p)}</td>
                  <td data-l="Stock" className="num">{p.stock} {p.unit === 'kg' ? 'kg' : 'packs'}</td>
                  <td data-l="Status">{!p.active ? <Pill tone="grey">Switched off</Pill> : p.stock <= 0 ? <Pill tone="red">Sold out</Pill> : p.marketListed ? <Pill tone="green">On market board</Pill> : <Pill tone="blue">For sale</Pill>}</td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={6} className="a-empty">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
