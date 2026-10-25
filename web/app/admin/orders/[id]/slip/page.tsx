'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { acall, fmtDateTime } from '@/lib/admin'
import { errText, Loading } from '@/components/admin/ui'
import { optionsText, rupees } from '@/lib/format'

type Order = {
  orderNo: string; total: number; createdAt: string; deliverySlot?: string
  items: { name: string; category: string; cut: string | null; weightG: number | null; qty: number; lineTotal: number }[]
  contact: { name: string; phone: string }
  shippingAddress: { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string }
  payment: { method: 'cod' | 'razorpay'; status: string }
}

export default function Slip() {
  const { id } = useParams<{ id: string }>()
  const [o, setO] = useState<Order | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { acall<{ order: Order }>(`/orders/${id}`).then((r) => setO(r.order)).catch((e) => setErr(errText(e))) }, [id])
  if (!o) return <Loading error={err} />
  const a = o.shippingAddress
  const cod = o.payment.method === 'cod' && o.payment.status === 'cod_due'
  return (
    <>
      <div className="noprint"><button className="btn" onClick={() => window.print()}>Print</button><button className="btn line2" onClick={() => window.close()}>Close</button></div>
      <div className="slip">
        <div className="hd"><h1 className="st">Raju Fishes</h1><div style={{ textAlign: 'right' }}><div className="st" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>Order #{o.orderNo}</div><div>{fmtDateTime(o.createdAt)}</div></div></div>
        <div className="box2"><b>Deliver to</b><br />{a.name} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} <b>{a.pincode}</b>{o.deliverySlot && <><br />Slot: {o.deliverySlot.replace(/_/g, ' ')}</>}</div>
        {cod && <div className="box2" style={{ borderWidth: 5 }}><b className="st" style={{ fontSize: 26 }}>Collect cash: {rupees(o.total)}</b></div>}
        <table>
          <thead><tr><th style={{ width: 28 }} /><th>Item</th><th>Option</th><th style={{ textAlign: 'right' }}>Qty</th></tr></thead>
          <tbody>{o.items.map((i, k) => (
            <tr key={k}><td><span className="tick" /></td><td><b>{i.name}</b></td><td>{optionsText(i)}</td><td style={{ textAlign: 'right', fontSize: 20 }}><b>{i.qty}</b></td></tr>
          ))}</tbody>
        </table>
        <p style={{ fontSize: 14 }}>{o.payment.method === 'cod' ? 'Cash on delivery' : 'Paid online'} · Total {rupees(o.total)}</p>
        <p style={{ fontSize: 13 }}>Packed on ice. Thank you for buying from Raju Fishes.</p>
      </div>
    </>
  )
}
