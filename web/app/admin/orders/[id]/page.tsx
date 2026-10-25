'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { acall, fmtDateTime, NEXT_STATUS, payLabel, STATUS_LABEL } from '@/lib/admin'
import { errText, Loading, Notice, PageHead, Pill, payTone, statusTone } from '@/components/admin/ui'
import { optionsText, rupees } from '@/lib/format'
import { toPaise, fromPaise } from '@/lib/admin'
import { useAdminUser } from '@/components/admin/AdminShell'
import { WhatsAppButton } from '@/components/admin/Alerts'

type Order = {
  _id: string; orderNo: string; status: string; total: number; subtotal: number; deliveryCharge: number; discount: number; couponCode?: string; createdAt: string; deliverySlot?: string
  items: { name: string; category: string; unit: string; cut: string | null; weightG: number | null; qty: number; unitPrice: number; lineTotal: number }[]
  contact: { name: string; phone: string; email?: string }
  shippingAddress: { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string }
  payment: { method: 'cod' | 'razorpay'; status: string; razorpayPaymentId?: string; paidAt?: string; refundId?: string; refundAmount?: number; refundedAt?: string; refundNote?: string }
  statusHistory: { status: string; at: string; by: string; note?: string }[]
  adminNote?: string; trackingNote?: string; cancelReason?: string
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const me = useAdminUser()
  const [o, setO] = useState<Order | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState<'cancel' | 'refund' | null>(null)
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState({ adminNote: '', trackingNote: '' })

  const load = () => acall<{ order: Order }>(`/orders/${id}`).then((r) => { setO(r.order); setNotes({ adminNote: r.order.adminNote ?? '', trackingNote: r.order.trackingNote ?? '' }) }).catch((e) => setErr(errText(e)))
  useEffect(() => { void load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(null)
    try { await fn(); await load(); setPanel(null); setReason(''); setMsg({ kind: 'ok', text: ok }) } catch (e) { setMsg({ kind: 'bad', text: errText(e) }) }
    setBusy(false)
  }
  if (!o) return <Loading error={err} />
  const next = NEXT_STATUS[o.status]
  const canPackNow = !(o.status === 'placed' && o.payment.method === 'razorpay' && o.payment.status !== 'paid')
  const canCancel = o.status !== 'delivered' && o.status !== 'cancelled' && (o.status !== 'shipped' || me.role === 'owner')
  const canRefund = ['paid', 'cod_collected'].includes(o.payment.status)
  const a = o.shippingAddress

  return (
    <>
      <PageHead title={`Order #${o.orderNo}`} sub={`Placed ${fmtDateTime(o.createdAt)}${o.deliverySlot ? ` · delivery slot: ${o.deliverySlot.replace(/_/g, ' ')}` : ''}`}>
        <Link href="/admin/orders" className="btn line2">← All orders</Link>
        <WhatsAppButton order={o} className="btn line2" />
        <Link href={`/admin/orders/${o._id}/slip`} target="_blank" className="btn">Print packing slip</Link>
      </PageHead>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="rowsplit">
        <div className="main">
          <div className="a-card">
            <h2>What to pack</h2>
            <div className="tblw" style={{ border: 0 }}>
              <table className="tbl">
                <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {o.items.map((i, k) => (
                    <tr key={k}><td><b>{i.name}</b><div className="small">{optionsText(i)}</div></td><td className="num"><b>{i.qty}</b></td><td className="num">{rupees(i.unitPrice)}</td><td className="num">{rupees(i.lineTotal)}</td></tr>
                  ))}
                  <tr><td colSpan={3} className="num">Items</td><td className="num">{rupees(o.subtotal)}</td></tr>
                  {o.discount > 0 && <tr><td colSpan={3} className="num">Coupon {o.couponCode}</td><td className="num">− {rupees(o.discount)}</td></tr>}
                  <tr><td colSpan={3} className="num">Delivery</td><td className="num">{o.deliveryCharge ? rupees(o.deliveryCharge) : 'Free'}</td></tr>
                  <tr><td colSpan={3} className="num"><b>Total</b></td><td className="num"><b>{rupees(o.total)}</b></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="a-card">
            <h2>Notes</h2>
            <div className="in fgrid">
              <div className="fld"><label htmlFor="an">Note for us (customers never see this)</label><textarea id="an" className="field" value={notes.adminNote} maxLength={1000} onChange={(e) => setNotes({ ...notes, adminNote: e.target.value })} /></div>
              <div className="fld"><label htmlFor="tn">Tracking note for the customer (courier name, number…)</label><input id="tn" className="field" value={notes.trackingNote} maxLength={300} onChange={(e) => setNotes({ ...notes, trackingNote: e.target.value })} /></div>
              <button type="button" className="btn sm" disabled={busy} onClick={() => act(() => acall(`/orders/${id}/note`, { method: 'PATCH', body: notes }), 'Notes saved.')}>Save notes</button>
            </div>
          </div>
        </div>
        <div className="side">
          <div className="a-card">
            <h2>Status</h2>
            <div className="in">
              <p style={{ marginTop: 0 }}><Pill tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Pill> <Pill tone={payTone(o.payment.status)}>{payLabel(o.payment)}</Pill></p>
              {o.status === 'cancelled' && o.cancelReason && <p className="small">Reason: {o.cancelReason}</p>}
              <div className="btnrow">
                {next && <button className="btn" disabled={busy || !canPackNow} onClick={() => act(() => acall(`/orders/${id}/status`, { method: 'PATCH', body: { status: next.to } }), `Order is now ${STATUS_LABEL[next.to].toLowerCase()}. The customer has been told.`)}>{next.label}</button>}
                {o.payment.status === 'cod_due' && o.status !== 'cancelled' && <button className="btn green" disabled={busy} onClick={() => act(() => acall(`/orders/${id}/mark-cod-collected`, { method: 'POST', body: {} }), 'Marked as cash collected.')}>Cash collected</button>}
                {canRefund && <button className="btn line2" disabled={busy} onClick={() => { setPanel(panel === 'refund' ? null : 'refund'); setAmount(fromPaise(o.total)) }}>Refund</button>}
                {canCancel && <button className="btn red" disabled={busy} onClick={() => setPanel(panel === 'cancel' ? null : 'cancel')}>Cancel order</button>}
              </div>
              {!canPackNow && <p className="small">This order is not paid yet, so it cannot be packed.</p>}
              {panel === 'cancel' && (
                <div className="fgrid" style={{ marginTop: 14 }}>
                  <div className="fld"><label htmlFor="cr">Why is it cancelled? (the customer sees this)</label><input id="cr" className="field" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} /></div>
                  <button className="btn red" disabled={busy || !reason.trim()} onClick={() => act(() => acall(`/orders/${id}/status`, { method: 'PATCH', body: { status: 'cancelled', note: reason.trim() } }), 'Order cancelled. The stock is back on the shelf.')}>Yes, cancel this order</button>
                </div>
              )}
              {panel === 'refund' && (
                <div className="fgrid" style={{ marginTop: 14 }}>
                  <div className="fld h2"><label htmlFor="ra">Amount in ₹</label><input id="ra" className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                  <div className="fld"><label htmlFor="rr">Reason</label><input id="rr" className="field" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} /></div>
                  <p className="small fld" style={{ margin: 0 }}>{o.payment.method === 'razorpay' ? 'The money goes back to the customer through Razorpay.' : 'This only records the refund. Give the cash back yourself.'}</p>
                  <button className="btn red" disabled={busy || !reason.trim() || toPaise(amount) === null || toPaise(amount) === 0} onClick={() => act(async () => {
                    const r = await acall<{ mock: boolean }>(`/orders/${id}/refund`, { method: 'POST', body: { amount: toPaise(amount), reason: reason.trim() } })
                    if (r.mock) setMsg({ kind: 'ok', text: 'Refund recorded in TEST MODE: no real money moved.' })
                  }, 'Refund recorded.')}>Refund {toPaise(amount) !== null ? rupees(toPaise(amount)!) : ''}</button>
                </div>
              )}
              {o.payment.refundId && <p className="small">Refunded {rupees(o.payment.refundAmount ?? 0)} ({o.payment.refundId}){o.payment.refundNote ? `: ${o.payment.refundNote}` : ''}</p>}
            </div>
          </div>
          <div className="a-card">
            <h2>Customer</h2>
            <div className="in">
              <dl className="kv">
                <dt>Name</dt><dd>{o.contact.name}</dd>
                <dt>Phone</dt><dd><a href={`tel:${o.contact.phone}`}><u>{o.contact.phone}</u></a></dd>
                {o.contact.email && <><dt>Email</dt><dd>{o.contact.email}</dd></>}
                <dt>Deliver to</dt><dd>{a.name}, {a.phone}<br/>{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br/>{a.city}, {a.state} {a.pincode}</dd>
                <dt>Payment</dt><dd>{o.payment.method === 'cod' ? 'Cash on delivery' : 'Online (Razorpay)'}{o.payment.razorpayPaymentId ? <div className="small">{o.payment.razorpayPaymentId}</div> : null}</dd>
              </dl>
            </div>
          </div>
          <div className="a-card">
            <h2>History</h2>
            <div className="in"><ul className="hist">{[...o.statusHistory].reverse().map((h, i) => (
              <li key={i}><span><b>{STATUS_LABEL[h.status] ?? h.status}</b>{h.note ? <span className="small"> · {h.note}</span> : null}<div className="small">{h.by.startsWith('admin') ? 'by shop staff' : h.by}</div></span><span className="small">{fmtDateTime(h.at)}</span></li>
            ))}</ul></div>
          </div>
        </div>
      </div>
    </>
  )
}
