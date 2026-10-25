'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useRef } from 'react'
import { acall, fmtDateTime, payLabel, STATUS_LABEL } from '@/lib/admin'
import { Loading, PageHead, Pill, payTone, statusTone, useLoad } from '@/components/admin/ui'
import { rupees } from '@/lib/format'
import { WhatsAppButton, useAlerts } from '@/components/admin/Alerts'

type O = { _id: string; orderNo: string; status: string; total: number; createdAt: string; contact: { name: string; phone: string }; shippingAddress: { city: string }; items: unknown[]; payment: { method: string; status: string } }

function List() {
  const { tick } = useAlerts()
  const router = useRouter()
  const sp = useSearchParams()
  const get = (k: string) => sp.get(k) ?? ''
  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString()); n.delete('page')
    if (v) n.set(k, v); else n.delete(k)
    router.replace(`/admin/orders?${n}`)
  }
  const qs = new URLSearchParams()
  for (const k of ['status', 'payment', 'method', 'q', 'page']) if (get(k)) qs.set(k, get(k))
  // dates are picked as days in India time
  if (get('from')) qs.set('from', new Date(`${get('from')}T00:00:00+05:30`).toISOString())
  if (get('to')) qs.set('to', new Date(`${get('to')}T23:59:59+05:30`).toISOString())
  const { data, error } = useLoad(() => acall<{ items: O[]; total: number; page: number; pages: number }>(`/orders?${qs}`), [qs.toString(), tick])
  const page = Number(get('page') || 1)
  const seen = useRef<Set<string> | null>(null)
  const last = useRef<unknown>(null)
  const fresh = useRef<Set<string>>(new Set())
  if (data && last.current !== data) {
    last.current = data
    fresh.current = new Set(seen.current ? data.items.filter((o) => !seen.current!.has(o._id)).map((o) => o._id) : [])
    seen.current = new Set(data.items.map((o) => o._id))
  }
  return (
    <>
      <PageHead title="Orders" sub="Orders waiting for online payment are hidden until they are paid. Choose “Waiting for payment” to see them.">
        <Link href="/admin/orders/picklist" target="_blank" className="btn line2">Print pick list (new orders)</Link>
      </PageHead>
      <div className="filters">
        <div className="fld"><label htmlFor="st">Status</label>
          <select id="st" className="field" value={get('status')} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="fld"><label htmlFor="pay">Payment</label>
          <select id="pay" className="field" value={get('payment')} onChange={(e) => setParam('payment', e.target.value)}>
            <option value="">All</option><option value="paid">Paid online</option><option value="cod_collected">Cash collected</option><option value="cod_due">Cash to collect</option><option value="pending">Waiting for payment</option><option value="refunded">Refunded</option></select></div>
        <div className="fld"><label htmlFor="me">Cash or online</label>
          <select id="me" className="field" value={get('method')} onChange={(e) => setParam('method', e.target.value)}>
            <option value="">Both</option><option value="cod">Cash on delivery</option><option value="razorpay">Online</option></select></div>
        <div className="fld"><label htmlFor="f">From</label><input id="f" type="date" className="field" value={get('from')} onChange={(e) => setParam('from', e.target.value)} /></div>
        <div className="fld"><label htmlFor="t">To</label><input id="t" type="date" className="field" value={get('to')} onChange={(e) => setParam('to', e.target.value)} /></div>
        <div className="fld grow"><label htmlFor="q">Order number or phone</label><input id="q" className="field" placeholder="e.g. 0421 or 98765…" defaultValue={get('q')} onKeyDown={(e) => { if (e.key === 'Enter') setParam('q', e.currentTarget.value.trim()) }} onBlur={(e) => { if (e.target.value.trim() !== get('q')) setParam('q', e.target.value.trim()) }} /></div>
      </div>
      {!data ? <Loading error={error} /> : (
        <>
          <div className="tblw">
            <table className="tbl stack">
              <thead><tr><th>Order</th><th>When</th><th>Customer</th><th className="num">Items</th><th className="num">Total</th><th>Payment</th><th>Status</th><th>Customer chat</th></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o._id} className={fresh.current.has(o._id) ? 'newrow' : undefined}>
                    <td data-l="Order"><Link className="rowlink" href={`/admin/orders/${o._id}`}>#{o.orderNo}</Link></td>
                    <td data-l="When">{fmtDateTime(o.createdAt)}</td>
                    <td data-l="Customer">{o.contact.name}<div className="small">{o.contact.phone} · {o.shippingAddress.city}</div></td>
                    <td data-l="Items" className="num">{o.items.length}</td>
                    <td data-l="Total" className="num"><b>{rupees(o.total)}</b></td>
                    <td data-l="Payment"><Pill tone={payTone(o.payment.status)}>{payLabel(o.payment)}</Pill><div className="small">{o.payment.method === 'cod' ? 'Cash on delivery' : 'Online'}</div></td>
                    <td data-l="Status"><Pill tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Pill></td>
                    <td data-l="Chat"><WhatsAppButton order={o} /></td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={8} className="a-empty">No orders match.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="btn sm line2" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>← Newer</button>
            <span>Page {data.page} of {data.pages} · {data.total} orders</span>
            <button className="btn sm line2" disabled={page >= data.pages} onClick={() => setParam('page', String(page + 1))}>Older →</button>
          </div>
        </>
      )}
    </>
  )
}
export default function Orders() { return <Suspense fallback={<p className="small">Loading…</p>}><List/></Suspense> }
