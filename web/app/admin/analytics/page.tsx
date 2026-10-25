'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { acall } from '@/lib/admin'
import { Loading, PageHead, Pill, useLoad } from '@/components/admin/ui'
import { rupees } from '@/lib/format'
import { Sk } from '@/components/Skel'

type Range = 'today' | '7d' | '30d'
const RANGES: { id: Range; label: string }[] = [{ id: 'today', label: 'Today' }, { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }]
type Row = { label: string; value: number }
type Ga = {
  connected: true; totalUsers: number; newUsers: number; returningUsers: number; sessions: number; avgEngagementSec: number
  topPages: { path: string; views: number }[]; sources: Row[]; devices: { mobile: number; desktop: number; tablet: number }; cities: Row[]
  funnel: { view_item: number; add_to_cart: number; begin_checkout: number; purchase: number }
}
type NotConnected = { connected: false; reason: string; message: string }
type Prod = { name: string; qty: number; revenue: number }
type Shop = {
  orders: number; revenue: number; avgOrderValue: number
  paymentSplit: { cod: { orders: number; revenue: number }; online: { orders: number; revenue: number } }
  ordersByStatus: Record<string, number>; topByQty: Prod[]; topByRevenue: Prod[]
  newCustomers: number; repeatCustomers: number; signups: number
  perDay: { day: string; orders: number; revenue: number }[]
}
type Summary = { range: Range; shop: Shop; ga: Ga | NotConnected }
type Live = { connected: true; activeNow: number } | NotConnected

const num = (n: number) => n.toLocaleString('en-IN')
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)
const shortDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const STATUS: [string, string][] = [['placed', 'New'], ['packed', 'Packed'], ['shipped', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']]

export default function Analytics() {
  const [range, setRange] = useState<Range>('7d')
  const { data, error } = useLoad(() => acall<Summary>(`/analytics/summary?range=${range}`), [range])
  const live = useLoad(() => acall<Live>('/analytics/realtime'), [])
  useEffect(() => { const t = setInterval(() => void live.reload(), 30_000); return () => clearInterval(t) }, [live])

  const stale = !!data && data.range !== range
  const ga = data?.ga
  const gaOk = ga && ga.connected ? ga : null
  return (
    <>
      <PageHead title="Analytics" sub="How many people visit the shop, and exactly what they buy.">
        <div className="an-range" role="group" aria-label="Time range">
          {RANGES.map((r) => <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
        </div>
      </PageHead>

      {error && !data ? <Loading error={error} /> : !data ? <AnalyticsSkeleton /> : (
        <div className={stale ? 'an-stale' : undefined} aria-busy={stale}>
          {!gaOk && (
            <div className="a-card an-connect">
              <h2>Connect analytics</h2>
              <div className="in">
                <p>{ga && !ga.connected && ga.reason === 'google_error' ? 'Google Analytics did not answer, so visitor numbers are hidden for now.' : 'Visitor numbers are not connected yet.'} The orders and money below are already exact, because they come from our own shop records.</p>
                <p>To see visitors, traffic sources and the buying funnel, follow the steps in <b>docs/ANALYTICS.md</b>. It takes about 20 minutes and costs nothing.</p>
              </div>
            </div>
          )}

          <div className="stats an-stats">
            <Stat l="Users online now" n={live.data && live.data.connected ? num(live.data.activeNow) : '–'} s={live.data && !live.data.connected ? 'not connected' : 'in the last 30 minutes'} dot />
            <Stat l="Total users" n={gaOk ? num(gaOk.totalUsers) : '–'} s={gaOk ? `${num(gaOk.newUsers)} new · ${num(gaOk.returningUsers)} returning` : 'not connected'} />
            <Stat l="Sessions" n={gaOk ? num(gaOk.sessions) : '–'} s={gaOk ? `${dur(gaOk.avgEngagementSec)} average time` : 'not connected'} />
            <Stat l="Orders" n={num(data.shop.orders)} s="paid online or cash on delivery" />
            <Stat l="Revenue" n={rupees(data.shop.revenue)} s="without cancelled orders" />
            <Stat l="Average order" n={rupees(data.shop.avgOrderValue)} s="revenue ÷ orders" />
          </div>

          <div className="a-card">
            <h2>Orders and revenue per day</h2>
            <div className="in"><DayChart days={data.shop.perDay} /></div>
          </div>

          <div className="a-card">
            <h2>From looking to buying</h2>
            <div className="in">{gaOk ? <Funnel f={gaOk.funnel} /> : <p className="small an-none">Connect Google Analytics to see how many people look, add to cart, start checkout and buy.</p>}</div>
          </div>

          <div className="an-two">
            <Table title="Top pages" head={['Page', 'Views']} rows={gaOk?.topPages.map((p) => [p.path, num(p.views)])} />
            <Table title="Where visitors come from" head={['Source', 'Sessions']} rows={gaOk?.sources.map((s) => [s.label, num(s.value)])} />
            <Table title="Top products by quantity" head={['Product', 'Sold']} rows={data.shop.topByQty.map((p) => [p.name, num(p.qty)])} exact />
            <Table title="Top products by revenue" head={['Product', 'Revenue']} rows={data.shop.topByRevenue.map((p) => [p.name, rupees(p.revenue)])} exact />
            <Table title="Top cities" head={['City', 'Users']} rows={gaOk?.cities.map((c) => [c.label, num(c.value)])} />
            <div className="a-card">
              <h2>Devices</h2>
              <div className="in">{gaOk ? <Devices d={gaOk.devices} /> : <p className="small an-none">Connect Google Analytics to see phone, computer and tablet visits.</p>}</div>
            </div>
          </div>

          <div className="an-two">
            <div className="a-card">
              <h2>Cash on delivery or online</h2>
              <div className="in">
                <Split a={{ label: 'Cash on delivery', orders: data.shop.paymentSplit.cod.orders, revenue: data.shop.paymentSplit.cod.revenue }} b={{ label: 'Paid online', orders: data.shop.paymentSplit.online.orders, revenue: data.shop.paymentSplit.online.revenue }} />
              </div>
            </div>
            <div className="a-card">
              <h2>Orders by status</h2>
              <div className="in an-pills">
                {STATUS.map(([k, l]) => <span key={k}><Pill tone={k === 'placed' ? 'yellow' : k === 'cancelled' ? 'red' : k === 'delivered' ? 'green' : 'blue'}>{l}</Pill> <b>{data.shop.ordersByStatus[k] ?? 0}</b></span>)}
              </div>
            </div>
            <div className="a-card">
              <h2>Customers</h2>
              <div className="in an-kv">
                <div><span>New buyers</span><b>{data.shop.newCustomers}</b></div>
                <div><span>Repeat buyers</span><b>{data.shop.repeatCustomers}</b></div>
                <div><span>New accounts</span><b>{data.shop.signups}</b></div>
              </div>
            </div>
          </div>

          <p className="small an-note">Visitor numbers come from Google Analytics and can be a few percent lower than reality. Orders and revenue are exact. <Link href="/admin/orders" className="textlink">See the orders</Link></p>
        </div>
      )}
    </>
  )
}

function Stat({ l, n, s, dot }: { l: string; n: string; s: string; dot?: boolean }) {
  return <div className="stat"><div className="l">{dot && <i className="an-dot" aria-hidden="true" />}{l}</div><div className="n">{n}</div><div className="s">{s}</div></div>
}

function AnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading analytics">
      <div className="stats an-stats">{Array.from({ length: 6 }, (_, i) => <Sk key={i} h={96} />)}</div>
      <Sk h={260} style={{ marginBottom: 24 }} />
      <Sk h={200} />
    </div>
  )
}

function Table({ title, head, rows, exact }: { title: string; head: [string, string]; rows?: string[][]; exact?: boolean }) {
  return (
    <div className="a-card">
      <h2>{title}</h2>
      {!rows ? <div className="in"><p className="small an-none">Connect Google Analytics to see this.</p></div> : rows.length === 0 ? <div className="a-empty">{exact ? 'No orders yet in this time.' : 'No visits yet in this time.'}</div> : (
        <table className="an-tbl">
          <thead><tr><th>{head[0]}</th><th className="num">{head[1]}</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{r[0]}</td><td className="num">{r[1]}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  )
}

function Funnel({ f }: { f: Ga['funnel'] }) {
  const steps: [string, number][] = [['Product views', f.view_item], ['Added to cart', f.add_to_cart], ['Started checkout', f.begin_checkout], ['Purchased', f.purchase]]
  const top = Math.max(1, steps[0][1])
  return (
    <ol className="an-funnel">
      {steps.map(([label, n], i) => {
        const prev = i ? steps[i - 1][1] : 0
        const drop = i && prev ? Math.round((1 - n / prev) * 100) : null
        return (
          <li key={label}>
            <div className="an-fl"><span>{label}</span><b>{num(n)}</b>{drop !== null && <small>{drop <= 0 ? 'no drop' : `−${drop}%`}</small>}</div>
            <div className="an-fbar"><i style={{ width: `${Math.max(2, (n / top) * 100)}%` }} /></div>
          </li>
        )
      })}
    </ol>
  )
}

function Devices({ d }: { d: Ga['devices'] }) {
  const total = d.mobile + d.desktop + d.tablet
  if (!total) return <p className="small an-none">No visits yet in this time.</p>
  const parts: [string, number, string][] = [['Phone', d.mobile, 'm'], ['Computer', d.desktop, 'd'], ['Tablet', d.tablet, 't']]
  return (
    <>
      <div className="an-dev" role="img" aria-label={parts.map(([l, n]) => `${l} ${Math.round((n / total) * 100)}%`).join(', ')}>
        {parts.filter(([, n]) => n > 0).map(([l, n, c]) => <i key={l} className={c} style={{ width: `${(n / total) * 100}%` }} />)}
      </div>
      <div className="an-legend">{parts.map(([l, n, c]) => <span key={l}><i className={c} />{l} <b>{Math.round((n / total) * 100)}%</b></span>)}</div>
    </>
  )
}

function Split({ a, b }: { a: { label: string; orders: number; revenue: number }; b: { label: string; orders: number; revenue: number } }) {
  const total = a.orders + b.orders
  if (!total) return <p className="small an-none">No orders yet in this time.</p>
  return (
    <>
      <div className="an-dev" role="img" aria-label={`${a.label} ${a.orders} orders, ${b.label} ${b.orders} orders`}>
        {a.orders > 0 && <i className="m" style={{ width: `${(a.orders / total) * 100}%` }} />}
        {b.orders > 0 && <i className="d" style={{ width: `${(b.orders / total) * 100}%` }} />}
      </div>
      <div className="an-legend">
        <span><i className="m" />{a.label} <b>{a.orders}</b> · {rupees(a.revenue)}</span>
        <span><i className="d" />{b.label} <b>{b.orders}</b> · {rupees(b.revenue)}</span>
      </div>
    </>
  )
}

/** Two lines in plain SVG: orders (dark) and revenue (blue), each drawn to its own scale so both are readable. */
function DayChart({ days }: { days: Shop['perDay'] }) {
  const W = 760, H = 220, L = 8, R = 8, T = 16, B = 28
  const maxO = Math.max(1, ...days.map((d) => d.orders)), maxR = Math.max(1, ...days.map((d) => d.revenue))
  const x = (i: number) => (days.length === 1 ? W / 2 : L + (i * (W - L - R)) / (days.length - 1))
  const y = (v: number, max: number) => T + (1 - v / max) * (H - T - B)
  const line = (key: 'orders' | 'revenue', max: number) => days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[key], max).toFixed(1)}`).join(' ')
  const every = Math.ceil(days.length / 4)
  const totalO = days.reduce((s, d) => s + d.orders, 0), totalR = days.reduce((s, d) => s + d.revenue, 0)
  return (
    <figure className="an-chart">
      <figcaption className="an-legend"><span><i className="d" />Orders <b>{totalO}</b></span><span><i className="b" />Revenue <b>{rupees(totalR)}</b></span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Orders and revenue for ${days.length} ${days.length === 1 ? 'day' : 'days'}. ${totalO} orders, ${rupees(totalR)}.`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((t) => <line key={t} className="grid" x1={L} x2={W - R} y1={T + t * (H - T - B)} y2={T + t * (H - T - B)} />)}
        {days.length > 1 && <path className="ln b" d={line('revenue', maxR)} vectorEffect="non-scaling-stroke" />}
        {days.length > 1 && <path className="ln d" d={line('orders', maxO)} vectorEffect="non-scaling-stroke" />}
        {days.map((d, i) => <g key={d.day}><circle className="pt b" cx={x(i)} cy={y(d.revenue, maxR)} r={days.length > 14 ? 0 : 4}><title>{`${shortDay(d.day)}: ${rupees(d.revenue)}`}</title></circle><circle className="pt d" cx={x(i)} cy={y(d.orders, maxO)} r={days.length > 14 ? 0 : 4}><title>{`${shortDay(d.day)}: ${d.orders} orders`}</title></circle></g>)}
      </svg>
      <div className="an-xs" aria-hidden="true">{days.map((d, i) => (i % every === 0 ? <span key={d.day} style={{ left: `${days.length === 1 ? 50 : (i / (days.length - 1)) * 100}%` }}>{shortDay(d.day)}</span> : null))}</div>
    </figure>
  )
}
