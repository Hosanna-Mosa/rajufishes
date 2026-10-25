'use client'
import Link from 'next/link'
import { acall } from '@/lib/admin'
import { Loading, PageHead, useLoad } from '@/components/admin/ui'
import { rupees } from '@/lib/format'

type Dash = { newToday: number; salesToday: number; toPack: number; waitingForPayment: number; lowStock: { _id: string; name: string; stock: number; unit: 'kg' | 'pack' }[] }

export default function Dashboard() {
  const { data, error } = useLoad(() => acall<Dash>('/dashboard'))
  if (!data) return <Loading error={error} />
  return (
    <>
      <PageHead title="Today" sub="What is happening in the shop right now.">
        <Link href="/admin/market" className="btn yellow shadow">Update the market board</Link>
      </PageHead>
      <div className="stats">
        <Link href="/admin/orders" className="stat"><div className="l st">Orders today</div><div className="n st">{data.newToday}</div><div className="s">paid online or cash on delivery</div></Link>
        <div className="stat y"><div className="l st">Sales today</div><div className="n st">{rupees(data.salesToday)}</div><div className="s">without cancelled orders</div></div>
        <Link href="/admin/orders?status=placed" className="stat b"><div className="l st">To pack</div><div className="n st">{data.toPack}</div><div className="s">{data.waitingForPayment ? `${data.waitingForPayment} more waiting for payment` : 'nothing waiting for payment'}</div></Link>
        <Link href="/admin/market" className="stat r"><div className="l st">Low stock</div><div className="n st">{data.lowStock.length}</div><div className="s">5 or fewer left</div></Link>
      </div>
      <div className="a-card">
        <h2 className="st">Running low</h2>
        {data.lowStock.length === 0 ? <div className="a-empty">Nothing is running low.</div> : (
          <div className="tblw" style={{ border: 0, boxShadow: 'none' }}>
            <table className="tbl">
              <thead><tr><th>Product</th><th className="num">Left</th><th /></tr></thead>
              <tbody>
                {data.lowStock.map((p) => (
                  <tr key={p._id}>
                    <td><Link className="rowlink" href={`/admin/products/${p._id}`}>{p.name}</Link></td>
                    <td className="num"><b>{p.stock}</b> {p.unit === 'kg' ? 'kg' : 'packs'}{p.stock === 0 && <> <span className="pill red">Sold out</span></>}</td>
                    <td className="num"><Link href="/admin/market" className="btn sm line2">Change on market board</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
