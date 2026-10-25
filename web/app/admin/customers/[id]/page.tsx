'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { acall, fmtDateTime, payLabel, STATUS_LABEL } from '@/lib/admin'
import { Loading, PageHead, Pill, payTone, statusTone, useLoad } from '@/components/admin/ui'
import { rupees } from '@/lib/format'

type D = { customer: { name?: string; phone: string; email?: string; createdAt: string }; orders: { _id: string; orderNo: string; status: string; total: number; createdAt: string; payment: { method: string; status: string } }[] }

export default function Customer() {
  const { id } = useParams<{ id: string }>()
  const { data, error } = useLoad(() => acall<D>(`/customers/${id}`), [id])
  if (!data) return <Loading error={error} />
  const c = data.customer
  return (
    <>
      <PageHead title={c.name || 'Customer'} sub={`${c.phone}${c.email ? ` · ${c.email}` : ''}`}><Link href="/admin/customers" className="btn line2">← All customers</Link></PageHead>
      <div className="tblw">
        <table className="tbl stack">
          <thead><tr><th>Order</th><th>When</th><th className="num">Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o._id}>
                <td data-l="Order"><Link className="rowlink" href={`/admin/orders/${o._id}`}>#{o.orderNo}</Link></td>
                <td data-l="When">{fmtDateTime(o.createdAt)}</td>
                <td data-l="Total" className="num">{rupees(o.total)}</td>
                <td data-l="Payment"><Pill tone={payTone(o.payment.status)}>{payLabel(o.payment)}</Pill></td>
                <td data-l="Status"><Pill tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Pill></td>
              </tr>
            ))}
            {data.orders.length === 0 && <tr><td colSpan={5} className="a-empty">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
