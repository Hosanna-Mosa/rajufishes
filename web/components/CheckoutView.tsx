'use client'
import Link from 'next/link'
import { Ticker } from './Motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearCart, useCart } from '@/lib/cart'
import { ApiError, call, type AddressT, type OrderT, type Slot } from '@/lib/client'
import { rupees } from '@/lib/format'
import { INDIA_STATES } from '@/lib/states'
import { useCustomer } from '@/lib/session'
import { useSite } from './SiteContext'
import { getSavedCoupon, saveCoupon, useQuote } from '@/lib/useQuote'

type Form = { name: string; phone: string; email: string; line1: string; line2: string; city: string; state: string; pincode: string }
const EMPTY: Form = { name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '' }
const FALLBACK_SLOTS: Slot[] = [{ id: 'tomorrow_morning', label: 'Tomorrow morning' }, { id: 'tomorrow_evening', label: 'Tomorrow evening' }]

export function CheckoutView() {
  const otp = useSite().loginMode === 'otp'
  const router = useRouter()
  const lines = useCart()
  const customer = useCustomer()
  const [ready, setReady] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [f, setF] = useState<Form>(EMPTY)
  const [slots, setSlots] = useState<Slot[]>(FALLBACK_SLOTS)
  const [slot, setSlot] = useState(FALLBACK_SLOTS[0].id)
  const [pay, setPay] = useState<'razorpay' | 'cod'>('razorpay')
  const [saved, setSaved] = useState<AddressT[]>([])
  const [pickedId, setPickedId] = useState('')
  const [errs, setErrs] = useState<Partial<Record<keyof Form, string>>>({})
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [codOk, setCodOk] = useState(true)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')

  useEffect(() => { setCoupon(getSavedCoupon()); setReady(true) }, [])
  useEffect(() => {
    call<{ slots: Slot[] }>('/meta/slots').then((r) => { if (r.slots?.length) { setSlots(r.slots); setSlot(r.slots[0].id) } }).catch(() => {})
  }, [])
  useEffect(() => {
    if (!customer) return
    setF((p) => ({ ...p, phone: p.phone || customer.phone, name: p.name || customer.name, email: p.email || customer.email }))
    call<{ addresses: AddressT[] }>('/me/addresses').then((r) => {
      setSaved(r.addresses)
      const d = r.addresses.find((a) => a.isDefault) ?? r.addresses[0]
      if (d) pick(d)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id])

  function pick(a: AddressT) {
    setPickedId(a._id)
    setF((p) => ({ ...p, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, pincode: a.pincode }))
  }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setF((p) => ({ ...p, [k]: k === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value }))
    setPickedId((id) => (k === 'name' || k === 'phone' || k === 'email' ? id : ''))
  }

  // pincode check against the delivery zones
  useEffect(() => {
    if (!/^\d{6}$/.test(f.pincode)) { setPinMsg(null); setCodOk(true); return }
    let stale = false
    call<{ deliverable: boolean; message?: string; etaDays: number; charge: number; freeOver: number; codAllowed: boolean }>(`/delivery/check?pincode=${f.pincode}${f.state ? `&state=${encodeURIComponent(f.state)}` : ''}`)
      .then((d) => {
        if (stale) return
        setCodOk(d.deliverable ? d.codAllowed : true)
        setPinMsg(d.deliverable ? { ok: true, text: `We deliver here in ${d.etaDays} days.` } : { ok: false, text: d.message || 'Sorry, we do not deliver to this pincode yet.' })
      })
      .catch(() => { if (!stale) setPinMsg(null) })
    return () => { stale = true }
  }, [f.pincode, f.state])
  useEffect(() => { if (!codOk && pay === 'cod') setPay('razorpay') }, [codOk, pay])

  const { quote, error } = useQuote(ready ? lines : [], { coupon, pincode: f.pincode, state: f.state, paymentMethod: pay })

  function validate() {
    const e: Partial<Record<keyof Form, string>> = {}
    if (!f.name.trim()) e.name = 'Please enter your name.'
    if (!/^(\+?91)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a 10 digit mobile number.'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'That email does not look right.'
    if (!f.line1.trim()) e.line1 = 'Please enter the house number and street.'
    if (!f.city.trim()) e.city = 'Please enter the city.'
    if (!f.state) e.state = 'Please choose the state.'
    if (!/^\d{6}$/.test(f.pincode)) e.pincode = 'Enter the 6 digit pincode.'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  async function place() {
    setFail('')
    if (!validate()) { setFail('Please check the highlighted boxes.'); return }
    if (pinMsg && !pinMsg.ok) { setFail(pinMsg.text); return }
    setBusy(true)
    try {
      const phone = f.phone.replace(/[\s-]/g, '')
      const r = await call<{ order: OrderT; razorpay: unknown; trackToken: string | null }>('/orders', { method: 'POST', body: {
        contact: { name: f.name.trim(), phone, ...(f.email ? { email: f.email } : {}) },
        address: { name: f.name.trim(), phone, line1: f.line1.trim(), ...(f.line2.trim() ? { line2: f.line2.trim() } : {}), city: f.city.trim(), state: f.state, pincode: f.pincode },
        deliverySlot: slot,
        items: lines.map(({ productId, cut, weightG, qty }) => ({ productId, cut, weightG, qty })),
        couponCode: coupon || null,
        paymentMethod: pay,
      } })
      clearCart(); saveCoupon('')
      const q = new URLSearchParams()
      if (r.trackToken) q.set('token', r.trackToken)
      q.set(pay === 'razorpay' ? 'pay' : 'placed', '1')
      router.replace(`/orders/${r.order.orderNo}?${q}`)
    } catch (e) {
      setFail(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  if (ready && lines.length === 0) {
    return (
      <div className="wrap" style={{ padding: '56px var(--gut)' }}>
        <div className="empty"><h2>Your cart is empty</h2><p>Add something first, then come back to check out.</p>
          <Link href="/products" className="btn big" style={{ padding: '0 32px' }}>Shop the catch</Link></div>
      </div>
    )
  }

  const fld = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, half = false) => (
    <div className={`fld${half ? ' half' : ''}`}>
      <label htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} className="field" value={f[k]} onChange={set(k)} aria-invalid={!!errs[k]} {...props} />
      {errs[k] ? <div className="err" role="alert">{errs[k]}</div> : null}
    </div>
  )
  const problems = quote?.problems ?? []

  return (
    <div className="wrap cols">
      <div className="left slidein">
        <section className="box">
          <div className="box-h">1 · Your details</div>
          <div className="box-b">
            {!customer && otp ? <p className="small" style={{ margin: 0, flex: '1 1 100%' }}>Ordering as a guest. <Link href="/sign-in" style={{ textDecoration: 'underline', fontWeight: 700 }}>Sign in</Link> to use saved addresses.</p> : null}
            {fld('name', 'Full name', { autoComplete: 'name' })}
            {fld('phone', 'Mobile number', { type: 'tel', inputMode: 'tel', placeholder: '+91', autoComplete: 'tel' })}
            {fld('email', 'Email (optional)', { type: 'email', autoComplete: 'email' })}
          </div>
        </section>

        <section className="box">
          <div className="box-h">2 · Delivery address</div>
          <div className="box-b">
            {saved.length > 0 ? (
              <div className="picker" role="group" aria-label="Saved addresses">
                {saved.map((a) => (
                  <button key={a._id} type="button" className={a._id === pickedId ? 'sel' : ''} onClick={() => pick(a)} aria-pressed={a._id === pickedId}>
                    <b>{a.label || 'Address'}{a.isDefault ? ' · default' : ''}</b><br/>{a.line1}, {a.city} {a.pincode}
                  </button>
                ))}
              </div>
            ) : null}
            {fld('line1', 'House number and street', { autoComplete: 'address-line1' })}
            {fld('line2', 'Area and landmark', { autoComplete: 'address-line2' })}
            {fld('city', 'City', { autoComplete: 'address-level2' }, true)}
            <div className="fld half">
              <label htmlFor="f-state">State</label>
              <select id="f-state" className="field" value={f.state} onChange={set('state')} aria-invalid={!!errs.state} autoComplete="address-level1">
                <option value="">Choose state</option>
                {INDIA_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errs.state ? <div className="err" role="alert">{errs.state}</div> : null}
            </div>
            {fld('pincode', 'Pincode', { inputMode: 'numeric', maxLength: 6, placeholder: '6 digits', autoComplete: 'postal-code' }, true)}
            {pinMsg ? <div className={pinMsg.ok ? 'good-t' : 'bad-t'} style={{ flex: '1 1 100%' }} role="status">{pinMsg.text}</div> : null}
            <div className="fld">
              <div className="lab" id="slot-l">Delivery time</div>
              <div className="radios" role="radiogroup" aria-labelledby="slot-l">
                {slots.map((s) => (
                  <label key={s.id} className={s.id === slot ? 'sel' : ''}>
                    <input type="radio" name="slot" checked={s.id === slot} onChange={() => setSlot(s.id)} />{s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="box">
          <div className="box-h">3 · Payment</div>
          <div className="box-b pay" role="radiogroup" aria-label="Payment">
            <label className={pay === 'razorpay' ? 'sel' : ''}>
              <span><input type="radio" name="pay" checked={pay === 'razorpay'} onChange={() => setPay('razorpay')} /><span className="t">Pay online</span></span>
              <p>UPI, cards and net banking.</p>
            </label>
            <label className={pay === 'cod' ? 'sel' : ''} style={codOk ? undefined : { opacity: 0.5 }}>
              <span><input type="radio" name="pay" disabled={!codOk} checked={pay === 'cod'} onChange={() => setPay('cod')} /><span className="t">Cash on delivery</span></span>
              <p>{codOk ? 'Pay when your order arrives.' : 'Not available for this pincode or order size.'}</p>
            </label>
          </div>
        </section>
      </div>

      <aside className="right sum" aria-label="Your order">
        <div className="sum-h">Your order</div>
        <div className="sum-b">
          {quote?.lines.map((l, i) => (
            <div className="r" key={i}><span>{l.name}{l.weightG && l.category === 'fresh' ? ` · ${l.weightG >= 1000 ? l.weightG / 1000 + ' kg' : l.weightG + ' g'}` : ''} × {l.qty}</span><b>{rupees(l.lineTotal)}</b></div>
          ))}
          <div className="r"><span>Delivery</span><b>{!quote ? '…' : quote.deliveryCharge === 0 ? 'Free' : rupees(quote.deliveryCharge)}</b></div>
          {quote && quote.discount > 0 ? <div className="r"><span>Coupon {quote.couponCode}</span><b>−{rupees(quote.discount)}</b></div> : null}
          <div className="total"><span>Total</span><span><Ticker value={quote?.total ?? 0} /></span></div>
          {error ? <div className="bad-t" role="alert">{error}</div> : null}
          {problems.map((p, i) => <div key={i} className="bad-t" role="alert">{p.message}</div>)}
          {fail ? <div className="bad-t" role="alert">{fail}</div> : null}
          <button className={`go${busy ? ' busy' : ''}`} disabled={busy || !quote || problems.length > 0} onClick={place} aria-busy={busy}>{busy ? 'Placing your order' : 'Place order'}</button>
          <div className="note">By placing the order you agree to our delivery terms. {pay === 'razorpay' ? 'Online orders are held for 30 minutes while you pay.' : ''}</div>
        </div>
      </aside>
    </div>
  )
}
