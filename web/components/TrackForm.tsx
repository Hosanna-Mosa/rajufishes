'use client'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ApiError, call } from '@/lib/client'

/** Find an order with its number and the phone it was placed with. Goes to the private tracking page. */
export function TrackForm() {
  const router = useRouter()
  const [orderNo, setOrderNo] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await call<{ order: { orderNo: string }; trackToken: string }>('/orders/lookup', { method: 'POST', body: { orderNo: orderNo.trim(), phone: phone.trim() } })
      router.push(`/orders/${r.order.orderNo}?token=${encodeURIComponent(r.trackToken)}`)
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Could not look that up. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="trackform" noValidate>
      <div className="fld"><label htmlFor="tn">Order number</label>
        <input id="tn" className="field" inputMode="numeric" autoComplete="off" placeholder="e.g. 0421" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} required /></div>
      <div className="fld"><label htmlFor="tp">Phone number used for the order</label>
        <input id="tp" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
      {err && <p role="alert" className="err">{err}</p>}
      <button className="btn st" disabled={busy || !orderNo.trim() || !phone.trim()}>{busy ? 'Looking…' : 'Track my order'}</button>
    </form>
  )
}
