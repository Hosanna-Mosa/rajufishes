'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addToCart } from '@/lib/cart'
import { ApiError, call, type AddressT, type OrderT } from '@/lib/client'
import { optionsText, rupees } from '@/lib/format'
import { INDIA_STATES } from '@/lib/states'
import { refreshCustomer, signOut, useCustomer } from '@/lib/session'
import { StatusSteps, statusText } from './StatusSteps'
import { strength } from './AuthForm'

const TABS = [['orders', 'Orders'], ['addresses', 'Saved addresses'], ['profile', 'Profile and password']] as const
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

export function AccountView() {
  const router = useRouter()
  const sp = useSearchParams()
  const tab = (TABS.find((t) => t[0] === sp.get('tab')) ?? TABS[0])[0]
  const customer = useCustomer()

  useEffect(() => { if (customer === null) router.replace('/sign-in?next=/account') }, [customer, router])

  return (
    <>
      <div className="wrap">
        <div className="banner">
          <h1>My account</h1>
          <p className="sub">{customer ? `Signed in as ${customer.email || customer.name}` : 'Checking…'}</p>
        </div>
      </div>
      {customer ? (
        <div className="wrap acct">
          <nav className="menu" aria-label="Account">
            {TABS.map(([k, label]) => <Link key={k} href={`/account?tab=${k}`} className={k === tab ? 'on' : ''} aria-current={k === tab ? 'page' : undefined}>{label}</Link>)}
            <button className="out" onClick={async () => { await signOut(); router.replace('/') }}>Sign out</button>
          </nav>
          <div className="acct-main">
            {tab === 'orders' ? <Orders/> : tab === 'addresses' ? <Addresses/> : <Profile/>}
          </div>
        </div>
      ) : null}
    </>
  )
}

function Orders() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderT[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { call<{ orders: OrderT[] }>('/orders').then((r) => setOrders(r.orders)).catch((e) => setErr(e instanceof ApiError ? e.message : 'Could not load your orders.')) }, [])

  function again(o: OrderT) {
    for (const it of o.items) {
      if (!it.productId) continue
      addToCart({ productId: String(it.productId), slug: it.slug, cut: it.cut, weightG: it.unit === 'kg' ? it.weightG : null, qty: it.qty })
    }
    router.push('/cart')
  }

  return (
    <>
      <h2>Your orders</h2>
      {err ? <p className="bad-t" role="alert">{err}</p> : null}
      {orders === null && !err ? <p>Loading…</p> : null}
      {orders?.length === 0 ? <div className="empty"><h2>No orders yet</h2><p>When you order, it shows up here.</p><Link href="/products" className="btn">Shop the catch</Link></div> : null}
      {orders ? <ClaimOrder onClaimed={() => call<{ orders: OrderT[] }>('/orders').then((r) => setOrders(r.orders))} /> : null}
      {orders?.map((o) => (
        <div className="ocard" key={o.orderNo}>
          <div className="ocard-h"><span>Order #{o.orderNo}</span><span>{day(o.createdAt)} · {statusText(o)}</span></div>
          <div className="ocard-b">
            <StatusSteps status={o.status} />
            <div className="orow">
              <div className="items">{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</div>
              <div className="amt">{rupees(o.total)}</div>
            </div>
            <div className="obtns">
              <Link href={`/orders/${o.orderNo}`} className="btn">Track order</Link>
              <button className="btn line2" onClick={() => again(o)}>Order again</button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

type AForm = { label: string; name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string; isDefault: boolean }
const blank = (name = '', phone = ''): AForm => ({ label: '', name, phone, line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false })

function Addresses() {
  const customer = useCustomer()
  const [list, setList] = useState<AddressT[] | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [f, setF] = useState<AForm>(blank())
  const [msg, setMsg] = useState('')
  const load = useCallback(() => call<{ addresses: AddressT[] }>('/me/addresses').then((r) => setList(r.addresses)).catch(() => setMsg('Could not load your addresses.')), [])
  useEffect(() => { void load() }, [load])

  function open(a?: AddressT) {
    setMsg('')
    if (a) { setEditing(a._id); setF({ label: a.label ?? '', name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, pincode: a.pincode, isDefault: !!a.isDefault }) }
    else { setEditing('new'); setF(blank(customer?.name, customer?.phone)) }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg('')
    if (!/^\d{6}$/.test(f.pincode)) return setMsg('Enter the 6 digit pincode.')
    if (!f.state) return setMsg('Please choose the state.')
    const body = { ...f, label: f.label.trim() || undefined, line2: f.line2.trim() || undefined }
    try {
      if (editing === 'new') await call('/me/addresses', { method: 'POST', body })
      else await call(`/me/addresses/${editing}`, { method: 'PATCH', body })
      setEditing(null); await load()
    } catch (err) { setMsg(err instanceof ApiError ? err.message : 'Could not save.') }
  }
  async function remove(a: AddressT) {
    if (!confirm('Remove this address?')) return
    try { await call(`/me/addresses/${a._id}`, { method: 'DELETE' }); await load() } catch { setMsg('Could not remove it.') }
  }
  const set = (k: keyof AForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : k === 'pincode' || k === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value }))
  const inp = (k: keyof AForm, label: string, half = true, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={`fld${half ? ' half' : ''}`}><label htmlFor={`a-${k}`}>{label}</label><input id={`a-${k}`} className="field" value={f[k] as string} onChange={set(k)} {...extra} /></div>
  )

  return (
    <>
      <h2>Saved addresses</h2>
      {msg ? <p className="bad-t" role="alert">{msg}</p> : null}
      <div className="addrs">
        {list?.map((a) => (
          <div className="addr" key={a._id}>
            <span className="tg">{a.label || 'Address'}{a.isDefault ? ' · default' : ''}</span>
            <p>{a.name}<br/>{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br/>{a.city}, {a.state} {a.pincode}<br/>{a.phone}</p>
            <div className="acts"><button className="linkbtn" onClick={() => open(a)}>Edit</button><button className="linkbtn" onClick={() => remove(a)}>Remove</button></div>
          </div>
        ))}
        {editing === null && (list?.length ?? 0) < 10 ? <button className="addr add" onClick={() => open()}>+ Add new address</button> : null}
      </div>
      {editing !== null ? (
        <form className="box" onSubmit={save}>
          <div className="box-h">{editing === 'new' ? 'New address' : 'Edit address'}</div>
          <div className="box-b">
            {inp('label', 'Label (Home, Work…)', true, { maxLength: 30 })}
            {inp('name', 'Full name', true, { required: true })}
            {inp('phone', 'Mobile number', true, { inputMode: 'tel', required: true, maxLength: 10 })}
            {inp('line1', 'House number and street', false, { required: true })}
            {inp('line2', 'Area and landmark', false)}
            {inp('city', 'City', true, { required: true })}
            <div className="fld half"><label htmlFor="a-state">State</label>
              <select id="a-state" className="field" value={f.state} onChange={set('state')} required><option value="">Choose state</option>{INDIA_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
            {inp('pincode', 'Pincode', true, { inputMode: 'numeric', maxLength: 6, required: true })}
            <label style={{ flex: '1 1 100%', display: 'flex', gap: 10, alignItems: 'center', minHeight: 44 }}><input type="checkbox" checked={f.isDefault} onChange={set('isDefault')} style={{ width: 22, height: 22 }} /> Make this my default address</label>
            <div className="obtns"><button className="btn">Save address</button><button type="button" className="btn line2" onClick={() => setEditing(null)}>Cancel</button></div>
          </div>
        </form>
      ) : null}
    </>
  )
}

function ClaimOrder({ onClaimed }: { onClaimed: () => void }) {
  const [open, setOpen] = useState(false)
  const [no, setNo] = useState('')
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')
  async function claim(e: React.FormEvent) {
    e.preventDefault(); setMsg('')
    try {
      await call('/me/orders/claim', { method: 'POST', body: { orderNo: no.trim(), phone: phone.replace(/\D/g, '').slice(-10) } })
      setMsg('Added to your account.'); setNo(''); setPhone(''); onClaimed()
    } catch (err) { setMsg(err instanceof ApiError ? err.message : 'Could not add that order.') }
  }
  if (!open) return <p className="small" style={{ margin: 0 }}>Ordered before as a guest? <button className="linkbtn" onClick={() => setOpen(true)}>Add that order to your account</button></p>
  return (
    <form className="box" onSubmit={claim}>
      <div className="box-h">Add an earlier guest order</div>
      <div className="box-b">
        <div className="fld half"><label htmlFor="cl-no">Order number</label><input id="cl-no" className="field" value={no} onChange={(e) => setNo(e.target.value)} maxLength={12} required /></div>
        <div className="fld half"><label htmlFor="cl-ph">Phone used on the order</label><input id="cl-ph" className="field" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required /></div>
        {msg ? <div className={msg.startsWith('Added') ? 'good-t' : 'bad-t'} role="status" style={{ flex: '1 1 100%' }}>{msg}</div> : null}
        <div className="obtns"><button className="btn">Add order</button><button type="button" className="btn line2" onClick={() => setOpen(false)}>Close</button></div>
      </div>
    </form>
  )
}

function Profile() {
  const router = useRouter()
  const customer = useCustomer()
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState({ current: '', password: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg('')
    try { await call('/me/profile', { method: 'PATCH', body: { name: name.trim(), phone } }); await refreshCustomer(); setMsg('Saved.') }
    catch (err) { setMsg(err instanceof ApiError ? err.message : 'Could not save.') }
  }
  async function change(e: React.FormEvent) {
    e.preventDefault(); setPwMsg('')
    if (pw.password !== pw.confirm) return setPwMsg('The two passwords do not match.')
    try { await call('/me/password', { method: 'POST', body: pw }); setPw({ current: '', password: '', confirm: '' }); setPwMsg('Password changed.') }
    catch (err) { setPwMsg(err instanceof ApiError ? err.message : 'Could not change the password.') }
  }
  const s = strength(pw.password)
  return (
    <>
      <h2>Profile</h2>
      <form className="box" onSubmit={save}>
        <div className="box-b">
          <div className="fld"><label htmlFor="p-name">Name</label><input id="p-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></div>
          <div className="fld"><label htmlFor="p-email">Email</label><input id="p-email" type="email" className="field" value={customer?.email ?? ''} readOnly /></div>
          <div className="fld"><label htmlFor="p-phone">Mobile number (used to prefill checkout)</label><input id="p-phone" className="field" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
          {msg ? <div className={msg === 'Saved.' ? 'good-t' : 'bad-t'} role="status" style={{ flex: '1 1 100%' }}>{msg}</div> : null}
          <div className="obtns"><button className="btn">Save</button><button type="button" className="btn line2" onClick={async () => { await signOut(); router.replace('/') }}>Sign out</button></div>
        </div>
      </form>
      <h2>Change password</h2>
      <form className="box" onSubmit={change}>
        <div className="box-b">
          <div className="fld"><label htmlFor="pw-cur">Current password</label><input id="pw-cur" type="password" className="field" autoComplete="current-password" maxLength={72} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></div>
          <div className="fld half"><label htmlFor="pw-new">New password</label><input id="pw-new" type="password" className="field" autoComplete="new-password" maxLength={72} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required aria-describedby="pw-hint" />
            <p id="pw-hint" className={`pw-hint l${s.level}`}>{s.label || 'At least 8 characters, with letters and a number.'}</p></div>
          <div className="fld half"><label htmlFor="pw-conf">Confirm new password</label><input id="pw-conf" type="password" className="field" autoComplete="new-password" maxLength={72} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></div>
          {pwMsg ? <div className={pwMsg === 'Password changed.' ? 'good-t' : 'bad-t'} role="status" style={{ flex: '1 1 100%' }}>{pwMsg}</div> : null}
          <div className="obtns"><button className="btn">Change password</button></div>
        </div>
      </form>
    </>
  )
}
