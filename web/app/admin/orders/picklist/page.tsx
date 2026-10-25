'use client'
import { useEffect, useState } from 'react'
import { acall, fmtDateTime } from '@/lib/admin'
import { errText, Loading } from '@/components/admin/ui'
import { optionsText } from '@/lib/format'

type O = { orderNo: string; items: { name: string; category: string; unit: string; cut: string | null; weightG: number | null; qty: number }[] }

/** All new orders added up by product, so one trip to the ice box fills many orders. */
export default function PickList() {
  const [orders, setOrders] = useState<O[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { acall<{ items: O[] }>('/orders?status=placed&limit=100').then((r) => setOrders(r.items)).catch((e) => setErr(errText(e))) }, [])
  if (!orders) return <Loading error={err} />
  const rows = new Map<string, { name: string; opt: string; qty: number; nos: string[] }>()
  for (const o of orders) for (const i of o.items) {
    const k = `${i.name}|${optionsText(i)}`
    const r = rows.get(k) ?? { name: i.name, opt: optionsText(i), qty: 0, nos: [] }
    r.qty += i.qty; r.nos.push(o.orderNo); rows.set(k, r)
  }
  const list = [...rows.values()].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <>
      <div className="noprint"><button className="btn" onClick={() => window.print()}>Print</button><button className="btn line2" onClick={() => window.close()}>Close</button></div>
      <div className="slip">
        <div className="hd"><h1 className="st">Pick list</h1><div>{orders.length} new orders · {fmtDateTime(new Date().toISOString())}</div></div>
        {list.length === 0 ? <p>No new orders to pack.</p> : (
          <table>
            <thead><tr><th style={{ width: 28 }} /><th>Item</th><th>Option</th><th style={{ textAlign: 'right' }}>Total qty</th><th>Orders</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.name + r.opt}><td><span className="tick" /></td><td><b>{r.name}</b></td><td>{r.opt}</td><td style={{ textAlign: 'right', fontSize: 20 }}><b>{r.qty}</b></td><td style={{ fontSize: 13 }}>{r.nos.map((n) => `#${n}`).join(' ')}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  )
}
