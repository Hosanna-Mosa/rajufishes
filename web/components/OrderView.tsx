'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApiError, call, type OrderT, type RazorpayInfo } from '@/lib/client'
import { optionsText, rupees } from '@/lib/format'
import { useSite } from './SiteContext'
import { StatusSteps, statusText } from './StatusSteps'

declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open(): void; on(e: string, cb: () => void): void } } }

const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((ok) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => ok(true)
    s.onerror = () => ok(false)
    document.head.appendChild(s)
  })
}

export function OrderView({ orderNo }: { orderNo: string }) {
  const otp = useSite().loginMode !== 'guest'
  const sp = useSearchParams()
  const token = sp.get('token') ?? undefined
  const justPlaced = sp.get('placed') === '1' || sp.get('pay') === '1'
  const [order, setOrder] = useState<OrderT | null>(null)
  const [missing, setMissing] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [mock, setMock] = useState<RazorpayInfo | null>(null)
  const auto = useRef(false)
  const q = token ? `?token=${encodeURIComponent(token)}` : ''

  const load = useCallback(async () => {
    try { setOrder((await call<{ order: OrderT }>(`/orders/${orderNo}${q}`)).order) }
    catch (e) { if (e instanceof ApiError && e.status !== 0) setMissing(true); else setMsg('We could not reach the shop. Please refresh.') }
  }, [orderNo, q])
  useEffect(() => { void load() }, [load])

  const verify = useCallback(async (p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
    try {
      await call('/payments/razorpay/verify', { method: 'POST', body: p })
      setMsg(''); await load()
    } catch (e) { setMsg(e instanceof ApiError ? e.message : 'We could not confirm the payment.') }
  }, [load])

  const startPayment = useCallback(async () => {
    setMsg(''); setBusy(true)
    try {
      const { razorpay } = await call<{ razorpay: RazorpayInfo }>(`/orders/${orderNo}/pay`, { method: 'POST', body: token ? { token } : {} })
      if (razorpay.mock) { setMock(razorpay); return }
      if (!(await loadRazorpay()) || !window.Razorpay) { setMsg('The payment window could not load. Check your internet and try again.'); return }
      const rz = new window.Razorpay({
        key: razorpay.keyId, amount: razorpay.amount, currency: 'INR', order_id: razorpay.orderId, name: 'Raju Fishes', description: `Order #${orderNo}`,
        handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void verify(r),
        modal: { ondismiss: () => setMsg('The payment window was closed. Your order is still waiting for payment.') },
      })
      rz.on('payment.failed', () => setMsg('The payment did not go through. You can try again.'))
      rz.open()
    } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Could not start the payment.') }
    finally { setBusy(false) }
  }, [orderNo, token, verify])

  const pending = !!order && order.payment.method === 'razorpay' && order.payment.status === 'pending' && order.status === 'placed'
  useEffect(() => {
    if (pending && sp.get('pay') === '1' && !auto.current) { auto.current = true; void startPayment() }
  }, [pending, sp, startPayment])

  async function mockPay(ok: boolean) {
    const m = mock; setMock(null)
    if (!m) return
    if (!ok) { setMsg('Test payment failed. Your order is still waiting for payment.'); return }
    try {
      const sig = await call<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>('/payments/mock/pay', { method: 'POST', body: { razorpay_order_id: m.orderId } })
      await verify(sig)
    } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Test payment failed.') }
  }

  async function cancel() {
    if (!confirm('Cancel this order?')) return
    setBusy(true)
    try { await call(`/orders/${orderNo}/cancel`, { method: 'POST', body: token ? { token } : {} }); setMsg(''); await load() }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Could not cancel.') }
    finally { setBusy(false) }
  }

  if (missing) return <div className="wrap" style={{ padding: '56px var(--gut)' }}><div className="empty"><h2>Order not found</h2><p>This link may be incomplete. Open the tracking link from your order page{otp ? ', or sign in to see your orders' : ''}, or look the order up with its number and your phone.</p><Link href={otp ? '/account' : '/track'} className="btn">{otp ? 'My orders' : 'Find my order'}</Link></div></div>
  if (!order) return <div className="wrap" style={{ padding: '56px var(--gut)' }} aria-busy="true">{msg || 'Loading your order…'}</div>

  const trackUrl = typeof window !== 'undefined' && token ? `${window.location.origin}/orders/${order.orderNo}?token=${token}` : ''
  const minsLeft = order.holdExpiresAt ? Math.max(0, Math.ceil((new Date(order.holdExpiresAt).getTime() - Date.now()) / 60000)) : 0

  return (
    <div className="wrap" style={{ padding: '40px var(--gut) 56px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900 }}>
      {pending ? (
        <div className="hold" role="status">
          Your order is waiting for payment. We are holding your items for {minsLeft} more {minsLeft === 1 ? 'minute' : 'minutes'}.
          <div className="obtns" style={{ marginTop: 10 }}>
            <button className="btn" disabled={busy} onClick={startPayment}>Pay {rupees(order.total)}</button>
            <button className="btn line2" disabled={busy} onClick={cancel}>Cancel order</button>
          </div>
        </div>
      ) : null}
      {msg ? <div className="alert" role="alert">{msg}</div> : null}

      <div className="ocard">
        <div className="ocard-h">
          <span>Order #{order.orderNo}</span>
          <span>{when(order.createdAt)} · {statusText(order)}</span>
        </div>
        <div className="ocard-b">
          {justPlaced && !pending && order.status !== 'cancelled' ? <div className="okwrap"><svg className="okbig" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="24" cy="24" r="21" pathLength={1} /><path d="M14 25l7 7 13-15" pathLength={1} /></svg><span className="okmark">Order placed</span><p style={{ margin: '10px 0 0' }}>Thank you, {order.contact.name}. We will pack it fresh and send it on its way.</p></div> : null}
          <StatusSteps status={order.status} />
          {order.items.map((it, i) => (
            <div className="r" key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}><b>{it.name}</b> × {it.qty}<br/><small>{optionsText({ cut: it.cut, weightG: it.weightG, category: it.category })}</small></span>
              <b>{rupees(it.lineTotal)}</b>
            </div>
          ))}
          <div className="kv"><span>Subtotal <b>{rupees(order.subtotal)}</b></span><span>Delivery <b>{order.deliveryCharge ? rupees(order.deliveryCharge) : 'Free'}</b></span>{order.discount ? <span>Coupon <b>−{rupees(order.discount)}</b></span> : null}</div>
          <div className="orow"><span style={{ fontSize: 28, fontWeight: 500 }}>Total {order.payment.method === 'cod' ? '(pay on delivery)' : ''}</span><span className="amt">{rupees(order.total)}</span></div>
          <div className="kv">
            <span>Deliver to <b>{order.shippingAddress.name}, {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</b></span>
          </div>
          {order.status === 'placed' && !pending ? <div className="obtns"><button className="btn line2" disabled={busy} onClick={cancel}>Cancel order</button></div> : null}
        </div>
      </div>

      {trackUrl ? (
        <div className="box"><div className="box-h">Track this order</div><div className="box-b">
          <p style={{ margin: 0, flex: '1 1 100%' }}>Keep this private link. Anyone with it can see this order, so please do not share it.</p>
          <input className="field" readOnly value={trackUrl} aria-label="Tracking link" onFocus={(e) => e.currentTarget.select()} style={{ flex: '1 1 100%' }} />
          <button className="btn" onClick={() => navigator.clipboard?.writeText(trackUrl).then(() => setMsg('Link copied.'))}>Copy link</button>
        </div></div>
      ) : null}
      <div className="obtns"><Link href="/products" className="btn">Shop more</Link><Link href={otp ? '/account' : '/track'} className="btn line2">{otp ? 'My orders' : 'Find another order'}</Link></div>

      {mock ? (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Test payment">
          <div className="sum"><div className="sum-h">Test payment</div><div className="sum-b">
            <span className="mockbadge">TEST MODE · no real money moves</span>
            <p style={{ margin: 0 }}>Razorpay is not connected, so this is a pretend payment window for {rupees(mock.amount)}.</p>
            <button className="go" onClick={() => mockPay(true)}>Pay {rupees(mock.amount)} (test)</button>
            <button className="btn line2" onClick={() => mockPay(false)}>Fail the payment</button>
            <button className="linkbtn" onClick={() => { setMock(null); setMsg('The payment window was closed. Your order is still waiting for payment.') }}>Close</button>
          </div></div>
        </div>
      ) : null}
    </div>
  )
}
