'use client'
import { useEffect, useState } from 'react'
import { acall, fromPaise, toPaise } from '@/lib/admin'
import { errText, Loading, Notice, PageHead, Pill, useLoad } from '@/components/admin/ui'
import { INDIA_STATES } from '@/lib/states'
import { rupees } from '@/lib/format'

type Zone = { _id: string; name: string; isDefault: boolean; charge: number; freeOver: number; minOrder: number; etaDays: number; codAllowed: boolean; freshAllowed: boolean; active: boolean; match: { pincodes: string[]; pincodePrefixes: string[]; states: string[] } }
type Settings = { restrictFreshToZones: boolean; freshOnlyMessage: string; codMaxTotal: number; stallPhone: string; whatsapp: string; businessName: string; stallEmail: string; stallAddress: string; openingHours: string }
type F = { _id?: string; name: string; isDefault: boolean; charge: string; freeOver: string; minOrder: string; etaDays: string; codAllowed: boolean; freshAllowed: boolean; active: boolean; pincodes: string; prefixes: string; states: string[] }
const blankZone: F = { name: '', isDefault: false, charge: '60', freeOver: '999', minOrder: '0', etaDays: '3', codAllowed: true, freshAllowed: true, active: true, pincodes: '', prefixes: '', states: [] }
const toF = (z: Zone): F => ({ _id: z._id, name: z.name, isDefault: z.isDefault, charge: fromPaise(z.charge), freeOver: fromPaise(z.freeOver), minOrder: fromPaise(z.minOrder), etaDays: String(z.etaDays), codAllowed: z.codAllowed, freshAllowed: z.freshAllowed, active: z.active, pincodes: z.match.pincodes.join(', '), prefixes: z.match.pincodePrefixes.join(', '), states: z.match.states })

export default function Delivery() {
  const zones = useLoad(() => acall<{ items: Zone[] }>('/zones'))
  const [settings, setSettings] = useState<Settings | null>(null)
  const [edit, setEdit] = useState<F | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [pin, setPin] = useState('')
  const [pinRes, setPinRes] = useState<string | null>(null)

  useEffect(() => { acall<{ settings: Settings }>('/settings').then((r) => setSettings(r.settings)).catch((e) => setMsg({ kind: 'bad', text: errText(e) })) }, [])

  async function saveSettings(patch: Partial<Settings>, ok: string) {
    setBusy(true); setMsg(null)
    try { const r = await acall<{ settings: Settings }>('/settings', { method: 'PATCH', body: patch }); setSettings(r.settings); setMsg({ kind: 'ok', text: ok }) } catch (e) { setMsg({ kind: 'bad', text: errText(e) }) }
    setBusy(false)
  }
  async function saveZone(e: React.FormEvent) {
    e.preventDefault()
    const f = edit!
    const charge = toPaise(f.charge), freeOver = toPaise(f.freeOver), minOrder = toPaise(f.minOrder)
    if (!f.name.trim()) return setMsg({ kind: 'bad', text: 'Please name the zone, for example “Hyderabad”.' })
    if (charge === null || freeOver === null || minOrder === null) return setMsg({ kind: 'bad', text: 'Charges must be numbers in rupees.' })
    const list = (v: string) => v.split(/[\s,]+/).filter(Boolean)
    const body = { name: f.name.trim(), isDefault: f.isDefault, charge, freeOver, minOrder, etaDays: Number(f.etaDays) || 0, codAllowed: f.codAllowed, freshAllowed: f.freshAllowed, active: f.active, match: { pincodes: list(f.pincodes), pincodePrefixes: list(f.prefixes), states: f.states } }
    setBusy(true); setMsg(null)
    try {
      await acall(f._id ? `/zones/${f._id}` : '/zones', { method: f._id ? 'PATCH' : 'POST', body })
      setEdit(null); await zones.reload(); setMsg({ kind: 'ok', text: 'Zone saved.' })
    } catch (x) { setMsg({ kind: 'bad', text: errText(x) }) }
    setBusy(false)
  }
  async function remove(z: Zone) {
    if (!confirm(`Delete the zone “${z.name}”?`)) return
    try { await acall(`/zones/${z._id}`, { method: 'DELETE' }); await zones.reload(); setMsg({ kind: 'ok', text: 'Zone deleted.' }) } catch (x) { setMsg({ kind: 'bad', text: errText(x) }) }
  }
  async function testPin(e: React.FormEvent) {
    e.preventDefault(); setPinRes(null)
    try {
      const r = await acall<{ zone: Zone | null }>(`/zones/check?pincode=${encodeURIComponent(pin.trim())}`)
      setPinRes(r.zone ? `${r.zone.name}: delivery ${r.zone.charge ? rupees(r.zone.charge) : 'free'}, free over ${rupees(r.zone.freeOver)}, ${r.zone.etaDays} days, cash on delivery ${r.zone.codAllowed ? 'yes' : 'no'}, fresh fish ${r.zone.freshAllowed ? 'yes' : 'no'}` : 'No zone covers this pincode, so the shop will not deliver there.')
    } catch (x) { setPinRes(errText(x)) }
  }
  const set = (patch: Partial<F>) => { setMsg(null); setEdit({ ...edit!, ...patch }) }

  if (!zones.data || !settings) return <Loading error={zones.error} />
  return (
    <>
      <PageHead title="Delivery" sub="Where we deliver and what it costs. The shop picks the zone that matches the customer’s pincode.">
        <button className="btn" onClick={() => { setMsg(null); setEdit(blankZone) }}>+ Add a zone</button>
      </PageHead>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="a-card">
        <h2>Fresh fish only to chosen cities</h2>
        <div className="in">
          <label className="chk"><input type="checkbox" checked={settings.restrictFreshToZones} disabled={busy} onChange={(e) => saveSettings({ restrictFreshToZones: e.target.checked }, e.target.checked ? 'Fresh fish is now only delivered to zones that allow it.' : 'Fresh fish can go anywhere we deliver.')} /> Only deliver fresh fish to zones marked “fresh fish allowed”</label>
          <p className="small" style={{ margin: '4px 0 0' }}>{settings.restrictFreshToZones ? 'ON: customers in other places can still buy dry and frozen packs.' : 'OFF: fresh fish goes to every pincode we deliver to.'}</p>
        </div>
      </div>

      {edit && (
        <form className="a-card" onSubmit={saveZone} noValidate>
          <h2>{edit._id ? 'Change zone' : 'New zone'}</h2>
          <div className="in fgrid">
            <div className="fld h2"><label htmlFor="zn">Zone name</label><input id="zn" className="field" value={edit.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} /></div>
            <div className="fld h2"><label htmlFor="ze">Delivery takes (days)</label><input id="ze" className="field" inputMode="numeric" value={edit.etaDays} onChange={(e) => set({ etaDays: e.target.value })} /></div>
            <div className="fld h3"><label htmlFor="zc">Delivery charge ₹</label><input id="zc" className="field" inputMode="decimal" value={edit.charge} onChange={(e) => set({ charge: e.target.value })} /></div>
            <div className="fld h3"><label htmlFor="zf">Free delivery above ₹</label><input id="zf" className="field" inputMode="decimal" value={edit.freeOver} onChange={(e) => set({ freeOver: e.target.value })} /><div className="hint">Use 0 for never free.</div></div>
            <div className="fld h3"><label htmlFor="zm">Smallest order ₹</label><input id="zm" className="field" inputMode="decimal" value={edit.minOrder} onChange={(e) => set({ minOrder: e.target.value })} /></div>
            <div className="fld"><label htmlFor="zp">Pincodes (6 digits, separated by commas or spaces)</label><textarea id="zp" className="field" value={edit.pincodes} onChange={(e) => set({ pincodes: e.target.value })} /></div>
            <div className="fld"><label htmlFor="zx">Pincodes that start with (a whole city or area)</label><input id="zx" className="field" value={edit.prefixes} onChange={(e) => set({ prefixes: e.target.value })} /><div className="hint">For example 500 matches every pincode from 500001 to 500999 (Hyderabad).</div></div>
            <div className="fld"><label htmlFor="zs">Whole states (hold Ctrl or Cmd to choose more than one)</label>
              <select id="zs" multiple className="field" style={{ height: 120 }} value={edit.states} onChange={(e) => set({ states: Array.from(e.target.selectedOptions).map((o) => o.value) })}>{INDIA_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <label className="chk fld"><input type="checkbox" checked={edit.freshAllowed} onChange={(e) => set({ freshAllowed: e.target.checked })} /> Fresh fish allowed here</label>
            <label className="chk fld"><input type="checkbox" checked={edit.codAllowed} onChange={(e) => set({ codAllowed: e.target.checked })} /> Cash on delivery allowed here</label>
            <label className="chk fld"><input type="checkbox" checked={edit.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} /> This is the default zone (used for any pincode no other zone covers)</label>
            <label className="chk fld"><input type="checkbox" checked={edit.active} onChange={(e) => set({ active: e.target.checked })} /> Zone is on</label>
            <div className="btnrow fld"><button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save zone'}</button><button type="button" className="btn line2" onClick={() => setEdit(null)}>Cancel</button></div>
          </div>
        </form>
      )}

      <div className="tblw">
        <table className="tbl stack">
          <thead><tr><th>Zone</th><th>Covers</th><th className="num">Charge</th><th className="num">Free over</th><th>Fresh</th><th>Cash</th><th/></tr></thead>
          <tbody>
            {zones.data.items.map((z) => (
              <tr key={z._id} className={z.active ? undefined : 'dim'}>
                <td data-l="Zone"><b>{z.name}</b> {z.isDefault && <Pill tone="blue">Default</Pill>} {!z.active && <Pill tone="grey">Off</Pill>}<div className="small">{z.etaDays} days</div></td>
                <td data-l="Covers" className="small" style={{ maxWidth: 280 }}>{[z.match.pincodes.length ? `${z.match.pincodes.length} pincodes` : '', z.match.pincodePrefixes.length ? `starting ${z.match.pincodePrefixes.join(', ')}` : '', z.match.states.length ? z.match.states.join(', ') : ''].filter(Boolean).join(' · ') || (z.isDefault ? 'Everywhere else' : '—')}</td>
                <td data-l="Charge" className="num">{z.charge ? rupees(z.charge) : 'Free'}</td>
                <td data-l="Free over" className="num">{z.freeOver ? rupees(z.freeOver) : 'never'}</td>
                <td data-l="Fresh">{z.freshAllowed ? 'Yes' : 'No'}</td>
                <td data-l="Cash">{z.codAllowed ? 'Yes' : 'No'}</td>
                <td className="num nolab"><div className="btnrow" style={{ justifyContent: 'flex-end' }}><button className="btn sm line2" onClick={() => { setMsg(null); setEdit(toF(z)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Change</button>{!z.isDefault && <button className="btn sm red" onClick={() => remove(z)}>Delete</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rowsplit" style={{ marginTop: 28 }}>
        <div className="main">
          <form className="a-card" onSubmit={testPin}>
            <h2>Test a pincode</h2>
            <div className="in fgrid">
              <div className="fld"><label htmlFor="tp">Pincode</label><input id="tp" className="field" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></div>
              <button className="btn" type="submit" disabled={pin.length !== 6}>Check</button>
              {pinRes && <p style={{ margin: 0, fontWeight: 600 }} role="status">{pinRes}</p>}
            </div>
          </form>
        </div>
        <div className="side">
          <SettingsCard s={settings} busy={busy} save={saveSettings} />
        </div>
      </div>
    </>
  )
}

function SettingsCard({ s, busy, save }: { s: Settings; busy: boolean; save: (p: Partial<Settings>, ok: string) => void }) {
  const [cod, setCod] = useState(fromPaise(s.codMaxTotal))
  const [phone, setPhone] = useState(s.stallPhone)
  const [wa, setWa] = useState(s.whatsapp)
  const [msgTxt, setMsgTxt] = useState(s.freshOnlyMessage)
  const [bn, setBn] = useState(s.businessName ?? '')
  const [em, setEm] = useState(s.stallEmail ?? '')
  const [addr, setAddr] = useState(s.stallAddress ?? '')
  const [hrs, setHrs] = useState(s.openingHours ?? '')
  const codP = toPaise(cod)
  return (
    <div className="a-card">
      <h2>Shop details and other settings</h2>
      <div className="in fgrid">
        <div className="fld"><label htmlFor="cm">Biggest cash on delivery order ₹ (0 = no limit)</label><input id="cm" className="field" inputMode="decimal" value={cod} onChange={(e) => setCod(e.target.value)} /></div>
        <div className="fld"><label htmlFor="fm">Message when fresh fish cannot go to a pincode</label><textarea id="fm" className="field" value={msgTxt} maxLength={300} onChange={(e) => setMsgTxt(e.target.value)} /></div>
        <div className="fld h2"><label htmlFor="sp">Stall phone</label><input id="sp" className="field" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="fld h2"><label htmlFor="wa">WhatsApp</label><input id="wa" className="field" value={wa} maxLength={20} onChange={(e) => setWa(e.target.value)} /></div>
        <div className="fld h2"><label htmlFor="bn">Business name (shown on the Contact page and policies)</label><input id="bn" className="field" value={bn} maxLength={80} onChange={(e) => setBn(e.target.value)} /></div>
        <div className="fld h2"><label htmlFor="se">Email for customers</label><input id="se" className="field" type="email" value={em} maxLength={120} onChange={(e) => setEm(e.target.value)} /></div>
        <div className="fld"><label htmlFor="sa">Stall address</label><textarea id="sa" className="field" value={addr} maxLength={400} onChange={(e) => setAddr(e.target.value)} /></div>
        <div className="fld"><label htmlFor="oh">Opening hours</label><input id="oh" className="field" value={hrs} maxLength={200} placeholder="Every day, 5 am to 1 pm" onChange={(e) => setHrs(e.target.value)} /></div>
        <button className="btn" disabled={busy || codP === null} onClick={() => save({ codMaxTotal: codP!, freshOnlyMessage: msgTxt, stallPhone: phone, whatsapp: wa, businessName: bn, stallEmail: em, stallAddress: addr, openingHours: hrs }, 'Settings saved.')}>Save settings</button>
      </div>
    </div>
  )
}
