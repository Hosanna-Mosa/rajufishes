'use client'
import { useEffect, useMemo, useState } from 'react'
import { acall, fromPaise, toPaise } from '@/lib/admin'
import { errText, Loading, Notice, PageHead, Switch } from '@/components/admin/ui'
import { landedIsToday, landedTime } from '@/lib/format'

type P = { _id: string; name: string; category: 'fresh' | 'dry' | 'frozen'; group: string; unit: 'kg' | 'pack'; price: number; stock: number; marketListed: boolean; marketOrder?: number; landedAt?: string | null }
type Row = { price: string; stock: string; listed: boolean; landedAt: string | null }

const toRow = (p: P): Row => ({ price: fromPaise(p.price), stock: String(p.stock), listed: p.marketListed, landedAt: p.landedAt ?? null })

export default function MarketBoard() {
  const [items, setItems] = useState<P[] | null>(null)
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [saved, setSaved] = useState<Record<string, Row>>({})
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const r = await acall<{ items: P[] }>('/market')
      const m: Record<string, Row> = {}
      r.items.forEach((p) => { m[p._id] = toRow(p) })
      setItems(r.items); setRows(m); setSaved(m)
    } catch (e) { setErr(errText(e)) }
  }
  useEffect(() => { void load() }, [])

  const changed = (id: string) => { const a = rows[id], b = saved[id]; return a && b && (a.price !== b.price || a.stock !== b.stock || a.listed !== b.listed || a.landedAt !== b.landedAt) }
  const invalid = (id: string) => { const r = rows[id]; return !r || toPaise(r.price) === null || !/^\d{1,6}(\.\d{1,3})?$/.test(r.stock.trim()) }
  const dirty = useMemo(() => (items ?? []).filter((p) => changed(p._id)), [items, rows, saved]) // eslint-disable-line react-hooks/exhaustive-deps
  const anyInvalid = dirty.some((p) => invalid(p._id))
  const set = (id: string, patch: Partial<Row>) => { setMsg(null); setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } })) }

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.length) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty.length])

  async function save() {
    setBusy(true); setMsg(null)
    try {
      await acall('/market', { method: 'PUT', body: { items: dirty.map((p) => ({
        productId: p._id, price: toPaise(rows[p._id].price), stock: parseFloat(rows[p._id].stock), listed: rows[p._id].listed,
        order: p.marketOrder ?? 0, ...(rows[p._id].landedAt && rows[p._id].landedAt !== saved[p._id].landedAt ? { landedAt: rows[p._id].landedAt } : {}),
      })) } })
      setMsg({ kind: 'ok', text: `Saved ${dirty.length} ${dirty.length === 1 ? 'product' : 'products'}. The shop shows the new prices now.` })
      await load()
    } catch (e) { setMsg({ kind: 'bad', text: errText(e) }) }
    setBusy(false)
  }

  if (!items) return <Loading error={err} />
  const shown = items.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  const groups = [...new Set(shown.map((p) => p.group))]
  return (
    <>
      <PageHead title="Today’s market board" sub="Set today’s price and stock for every product, switch products on or off for today, then press Save once." />
      <div className="mb-bar">
        <button className="btn big" type="button" onClick={save} disabled={busy || dirty.length === 0 || anyInvalid}>{busy ? 'Saving…' : 'Save'}</button>
        <div className="grow st" style={{ fontSize: 24, fontWeight: 800 }}>
          {anyInvalid ? 'Fix the red boxes first' : dirty.length ? `${dirty.length} ${dirty.length === 1 ? 'change' : 'changes'} not saved yet` : 'Everything is saved'}
        </div>
        <input className="field" placeholder="Find a product…" aria-label="Find a product" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="tblw">
        <table className="tbl stack">
          <thead><tr><th>Product</th><th>On the site today</th><th>Price</th><th>Stock</th><th>Landed</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <MarketGroup key={g} name={g}>
                {shown.filter((p) => p.group === g).map((p) => {
                  const r = rows[p._id]
                  const bad = invalid(p._id)
                  const stockNum = parseFloat(r.stock)
                  return (
                    <tr key={p._id} className={changed(p._id) ? (bad ? 'bad' : 'chg') : !r.listed ? 'dim' : undefined}>
                      <td data-l="Product"><b>{p.name}</b> {stockNum === 0 && !bad && <span className="pill red">Sold out</span>}</td>
                      <td data-l="On the site today"><Switch on={r.listed} onChange={(v) => set(p._id, { listed: v })} label={`Show ${p.name} on the market board today`} /></td>
                      <td data-l="Price"><span className="cellin"><span className="u">₹</span><input className={`field ${toPaise(r.price) === null ? 'bad' : ''}`} inputMode="decimal" aria-label={`${p.name} price`} value={r.price} onChange={(e) => set(p._id, { price: e.target.value })} /><span className="u">{p.unit === 'kg' ? 'per kg' : 'per pack'}</span></span></td>
                      <td data-l="Stock"><span className="cellin"><input className={`field ${!/^\d{1,6}(\.\d{1,3})?$/.test(r.stock.trim()) ? 'bad' : ''}`} inputMode="decimal" aria-label={`${p.name} stock`} value={r.stock} onChange={(e) => set(p._id, { stock: e.target.value })} /><span className="u">{p.unit === 'kg' ? 'kg' : 'packs'}</span></span></td>
                      <td data-l="Landed">
                        {r.landedAt && landedIsToday(r.landedAt) ? <span className="small"><b>{landedTime(r.landedAt)}</b> today </span> : p.category === 'fresh' ? <span className="small">not today </span> : <span className="small">—</span>}
                        {p.category === 'fresh' && <button type="button" className="btn sm line2" onClick={() => set(p._id, { landedAt: new Date().toISOString() })}>Landed now</button>}
                      </td>
                    </tr>
                  )
                })}
              </MarketGroup>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="a-empty">No product matches “{q}”.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

function MarketGroup({ name, children }: { name: string; children: React.ReactNode }) {
  return <><tr className="grp"><td colSpan={5} className="st nolab">{name}</td></tr>{children}</>
}
