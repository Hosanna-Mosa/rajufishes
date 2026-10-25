'use client'
import { useState } from 'react'
import { acall, fmtDay, fromPaise, toPaise } from '@/lib/admin'
import { errText, Loading, Notice, PageHead, Pill, useLoad } from '@/components/admin/ui'
import { rupees } from '@/lib/format'

type C = { _id: string; code: string; type: 'percent' | 'flat'; value: number; maxDiscount: number; minSubtotal: number; startsAt?: string | null; endsAt?: string | null; usageLimit: number; usedCount: number; perCustomerLimit: number; active: boolean }
type F = { _id?: string; code: string; type: 'percent' | 'flat'; value: string; maxDiscount: string; minSubtotal: string; startsAt: string; endsAt: string; usageLimit: string; perCustomerLimit: string; active: boolean }
const blank: F = { code: '', type: 'percent', value: '10', maxDiscount: '0', minSubtotal: '0', startsAt: '', endsAt: '', usageLimit: '0', perCustomerLimit: '1', active: true }
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '')
const toF = (c: C): F => ({ _id: c._id, code: c.code, type: c.type, value: c.type === 'percent' ? String(c.value) : fromPaise(c.value), maxDiscount: fromPaise(c.maxDiscount), minSubtotal: fromPaise(c.minSubtotal), startsAt: day(c.startsAt), endsAt: day(c.endsAt), usageLimit: String(c.usageLimit), perCustomerLimit: String(c.perCustomerLimit), active: c.active })

export default function Coupons() {
  const { data, error, reload } = useLoad(() => acall<{ items: C[] }>('/coupons'))
  const [f, setF] = useState<F | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<F>) => { setMsg(null); setF({ ...f!, ...p }) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const x = f!
    const value = x.type === 'percent' ? Number(x.value) : toPaise(x.value)
    const maxD = toPaise(x.maxDiscount), minS = toPaise(x.minSubtotal)
    if (!x._id && !/^[A-Za-z0-9]{3,20}$/.test(x.code.trim())) return setMsg({ kind: 'bad', text: 'The code needs 3 to 20 letters or numbers, with no spaces.' })
    if (!value || !Number.isFinite(value) || (x.type === 'percent' && (!Number.isInteger(value) || value > 100))) return setMsg({ kind: 'bad', text: x.type === 'percent' ? 'Percent must be a whole number from 1 to 100.' : 'Enter the discount amount in rupees.' })
    if (maxD === null || minS === null) return setMsg({ kind: 'bad', text: 'Amounts must be numbers in rupees.' })
    const body = { ...(x._id ? {} : { code: x.code.trim() }), type: x.type, value, maxDiscount: maxD, minSubtotal: minS, startsAt: x.startsAt ? new Date(`${x.startsAt}T00:00:00+05:30`).toISOString() : null, endsAt: x.endsAt ? new Date(`${x.endsAt}T23:59:59+05:30`).toISOString() : null, usageLimit: Number(x.usageLimit) || 0, perCustomerLimit: Number(x.perCustomerLimit) || 0, active: x.active }
    setBusy(true); setMsg(null)
    try { await acall(x._id ? `/coupons/${x._id}` : '/coupons', { method: x._id ? 'PATCH' : 'POST', body }); setF(null); await reload(); setMsg({ kind: 'ok', text: 'Coupon saved.' }) } catch (er) { setMsg({ kind: 'bad', text: errText(er) }) }
    setBusy(false)
  }
  async function toggle(c: C) {
    try { await acall(`/coupons/${c._id}`, { method: 'PATCH', body: { active: !c.active } }); await reload() } catch (er) { setMsg({ kind: 'bad', text: errText(er) }) }
  }

  if (!data) return <Loading error={error} />
  return (
    <>
      <PageHead title="Coupons" sub="Discount codes customers type at checkout."><button className="btn yellow shadow" onClick={() => { setMsg(null); setF(blank) }}>+ Add a coupon</button></PageHead>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {f && (
        <form className="a-card" onSubmit={save} noValidate>
          <h2 className="st">{f._id ? `Change ${f.code}` : 'New coupon'}</h2>
          <div className="in fgrid">
            {!f._id && <div className="fld h3"><label htmlFor="cc">Code</label><input id="cc" className="field" value={f.code} maxLength={20} onChange={(e) => set({ code: e.target.value.toUpperCase() })} /></div>}
            <div className="fld h3"><label htmlFor="ct">Kind of discount</label><select id="ct" className="field" value={f.type} onChange={(e) => set({ type: e.target.value as F['type'] })}><option value="percent">Percent off</option><option value="flat">Rupees off</option></select></div>
            <div className="fld h3"><label htmlFor="cv">{f.type === 'percent' ? 'Percent off' : 'Rupees off'}</label><input id="cv" className="field" inputMode="decimal" value={f.value} onChange={(e) => set({ value: e.target.value })} /></div>
            {f.type === 'percent' && <div className="fld h3"><label htmlFor="cx">Most it can take off ₹ (0 = no limit)</label><input id="cx" className="field" inputMode="decimal" value={f.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} /></div>}
            <div className="fld h3"><label htmlFor="cm">Smallest order ₹</label><input id="cm" className="field" inputMode="decimal" value={f.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} /></div>
            <div className="fld h3"><label htmlFor="cs">Starts</label><input id="cs" type="date" className="field" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></div>
            <div className="fld h3"><label htmlFor="ce">Ends</label><input id="ce" type="date" className="field" value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} /></div>
            <div className="fld h3"><label htmlFor="cu">Can be used this many times in all (0 = no limit)</label><input id="cu" className="field" inputMode="numeric" value={f.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} /></div>
            <div className="fld h3"><label htmlFor="cp">Times per customer (0 = no limit)</label><input id="cp" className="field" inputMode="numeric" value={f.perCustomerLimit} onChange={(e) => set({ perCustomerLimit: e.target.value })} /></div>
            <label className="chk fld"><input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> Coupon is on</label>
            <div className="btnrow fld"><button className="btn yellow" disabled={busy}>{busy ? 'Saving…' : 'Save coupon'}</button><button type="button" className="btn line2" onClick={() => setF(null)}>Cancel</button></div>
          </div>
        </form>
      )}
      <div className="tblw">
        <table className="tbl stack">
          <thead><tr><th>Code</th><th>Discount</th><th>Smallest order</th><th>Valid</th><th className="num">Used</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c._id} className={c.active ? undefined : 'dim'}>
                <td data-l="Code"><b>{c.code}</b></td>
                <td data-l="Discount">{c.type === 'percent' ? `${c.value}% off${c.maxDiscount ? ` (up to ${rupees(c.maxDiscount)})` : ''}` : `${rupees(c.value)} off`}</td>
                <td data-l="Smallest order">{c.minSubtotal ? rupees(c.minSubtotal) : 'any'}</td>
                <td data-l="Valid" className="small">{c.startsAt || c.endsAt ? `${c.startsAt ? fmtDay(c.startsAt) : 'now'} to ${c.endsAt ? fmtDay(c.endsAt) : 'no end'}` : 'always'}</td>
                <td data-l="Used" className="num">{c.usedCount}{c.usageLimit ? ` of ${c.usageLimit}` : ''}</td>
                <td data-l="Status">{c.active ? <Pill tone="green">On</Pill> : <Pill tone="grey">Off</Pill>}</td>
                <td className="nolab"><div className="btnrow" style={{ justifyContent: 'flex-end' }}><button className="btn sm line2" onClick={() => { setMsg(null); setF(toF(c)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Change</button><button className="btn sm" onClick={() => toggle(c)}>{c.active ? 'Switch off' : 'Switch on'}</button></div></td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan={7} className="a-empty">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
