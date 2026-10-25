import { Order } from '../models/Order.js'
import { Customer } from '../models/Customer.js'
import { istDay } from './ist.js'
import type { Range } from './ga.js'

const DAYS: Record<Range, number> = { today: 1, '7d': 7, '30d': 30 }
const DAY_MS = 86_400_000
const IST_OFFSET = '+05:30'

type Lean = {
  total?: number; createdAt: Date; status: string; customerId?: unknown
  payment?: { method?: string }; contact?: { phone?: string | null } | null
  items: { productId: unknown; name?: string; qty?: number; lineTotal?: number }[]
}
const find = (q: object, fields: string) => Order.find(q as never).select(fields).lean() as unknown as Promise<Lean[]>

/** Orders that count as sales: not cancelled, and paid online or cash on delivery (an unpaid online order is not a sale yet). */
const COUNTED = { status: { $ne: 'cancelled' }, 'payment.status': { $in: ['paid', 'cod_due', 'cod_collected'] } }

export function rangeStart(range: Range, now = new Date()): Date {
  const today = new Date(`${istDay(now)}T00:00:00${IST_OFFSET}`)
  return new Date(today.getTime() - (DAYS[range] - 1) * DAY_MS)
}

/** Exact numbers from our own database, in paise. Same shape whether or not Google is connected. */
export async function shopStats(range: Range, now = new Date()) {
  const from = rangeStart(range, now)
  const inRange = { createdAt: { $gte: from, $lte: now } }

  const [counted, allInRange, signups] = await Promise.all([
    find({ ...COUNTED, ...inRange }, 'total payment.method items customerId contact.phone createdAt'),
    find(inRange, 'status'),
    Customer.countDocuments({ createdAt: { $gte: from, $lte: now } }),
  ])

  const revenue = counted.reduce((s, o) => s + (o.total ?? 0), 0)
  const split = { cod: { orders: 0, revenue: 0 }, online: { orders: 0, revenue: 0 } }
  for (const o of counted) { const k = o.payment?.method === 'cod' ? 'cod' : 'online'; split[k].orders++; split[k].revenue += o.total ?? 0 }

  const ordersByStatus: Record<string, number> = { placed: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 }
  for (const o of allInRange) ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1

  // top products
  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const o of counted) for (const it of o.items) {
    const k = String(it.productId)
    const r = byProduct.get(k) ?? { name: it.name ?? 'Product', qty: 0, revenue: 0 }
    r.qty += it.qty ?? 0; r.revenue += it.lineTotal ?? 0
    byProduct.set(k, r)
  }
  const prods = [...byProduct.values()]
  const topByQty = [...prods].sort((a, b) => b.qty - a.qty).slice(0, 5)
  const topByRevenue = [...prods].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // new vs repeat buyers: repeat means they also bought before this range began
  const keyOf = (o: { customerId?: unknown; contact?: { phone?: string | null } | null }) => (o.customerId ? `c:${o.customerId}` : o.contact?.phone ? `p:${o.contact.phone}` : '')
  const buyers = new Map<string, { customerId?: unknown; phone?: string | null }>()
  for (const o of counted) { const k = keyOf(o); if (k) buyers.set(k, { customerId: o.customerId, phone: o.contact?.phone }) }
  let repeatCustomers = 0
  if (buyers.size) {
    const ids = [...buyers.values()].filter((b) => b.customerId).map((b) => b.customerId)
    const phones = [...buyers.values()].filter((b) => !b.customerId && b.phone).map((b) => b.phone as string)
    const before = await find({ ...COUNTED, createdAt: { $lt: from }, $or: [{ customerId: { $in: ids } }, { customerId: null, 'contact.phone': { $in: phones } }] }, 'customerId contact.phone')
    repeatCustomers = new Set(before.map(keyOf).filter((k) => buyers.has(k))).size
  }

  // one row per IST day, so the chart has no gaps
  const days: { day: string; orders: number; revenue: number }[] = []
  for (let i = 0; i < DAYS[range]; i++) days.push({ day: istDay(from.getTime() + i * DAY_MS), orders: 0, revenue: 0 })
  const at = new Map(days.map((d) => [d.day, d]))
  for (const o of counted) { const d = at.get(istDay(o.createdAt)); if (d) { d.orders++; d.revenue += o.total ?? 0 } }

  return {
    range,
    orders: counted.length,
    revenue,
    avgOrderValue: counted.length ? Math.round(revenue / counted.length) : 0,
    paymentSplit: split,
    ordersByStatus,
    topByQty, topByRevenue,
    newCustomers: buyers.size - repeatCustomers,
    repeatCustomers,
    signups,
    perDay: days,
  }
}
