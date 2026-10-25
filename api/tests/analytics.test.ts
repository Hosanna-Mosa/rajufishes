import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { AdminUser } from '../src/models/AdminUser.js'
import { Customer } from '../src/models/Customer.js'
import { Order } from '../src/models/Order.js'
import { setClockForTests, setGaClientForTests, type GaClient } from '../src/services/ga.js'
import { env } from '../src/config/env.js'
import { kgProduct, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()
const PASS = 'a-long-test-password'

async function login(role: 'owner' | 'staff') {
  const email = `${role}@t.test`
  await AdminUser.updateOne({ email }, { $set: { email, name: role, role, active: true, passwordHash: await bcrypt.hash(PASS, 4) } }, { upsert: true })
  const r = await request(app).post('/api/admin/auth/login').send({ email, password: PASS })
  const cookie = (r.headers['set-cookie'] as unknown as string[])[0].split(';')[0]
  return (url: string) => request(app).get(`/api/admin${url}`).set('Cookie', cookie)
}

let n = 0
async function order(p: { _id: unknown; name: string }, over: Record<string, unknown> = {}, qty = 1, price = 50000) {
  return Order.create({
    orderNo: `T${++n}`, items: [{ productId: p._id, name: p.name, qty, unitPrice: price, lineTotal: qty * price }],
    total: qty * price, status: 'placed', payment: { method: 'cod', status: 'cod_due' }, contact: { name: 'x', phone: '9876543210' },
    shippingAddress: { name: 'x', phone: '9876543210', line1: '1 Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001' }, ...over,
  })
}
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000)

class FakeGa implements GaClient {
  calls = 0
  async runReport(req: Record<string, unknown>) {
    this.calls++
    const dims = (req.dimensions as { name: string }[] | undefined)?.[0]?.name
    const rows: Record<string, { dimensionValues?: { value: string }[]; metricValues: { value: string }[] }[]> = {
      none: [{ metricValues: [{ value: '120' }, { value: '80' }, { value: '150' }, { value: '3000' }, { value: '100' }] }],
      pagePath: [{ dimensionValues: [{ value: '/' }], metricValues: [{ value: '400' }] }],
      sessionDefaultChannelGroup: [{ dimensionValues: [{ value: 'Direct' }], metricValues: [{ value: '90' }] }],
      deviceCategory: [{ dimensionValues: [{ value: 'mobile' }], metricValues: [{ value: '120' }] }, { dimensionValues: [{ value: 'desktop' }], metricValues: [{ value: '30' }] }],
      city: [{ dimensionValues: [{ value: 'Hyderabad' }], metricValues: [{ value: '60' }] }, { dimensionValues: [{ value: '(not set)' }], metricValues: [{ value: '9' }] }],
      eventName: [{ dimensionValues: [{ value: 'view_item' }], metricValues: [{ value: '300' }] }, { dimensionValues: [{ value: 'purchase' }], metricValues: [{ value: '12' }] }],
    }
    return [{ rows: rows[dims ?? 'none'] }] as never
  }
  async runRealtimeReport() { this.calls++; return [{ rows: [{ metricValues: [{ value: '7' }] }] }] as never }
}

afterEach(() => { setGaClientForTests(null); setClockForTests(null); env.GA4_PROPERTY_ID = ''; env.GA_SERVICE_ACCOUNT_JSON_BASE64 = '' })

describe('admin analytics access', () => {
  it('lets the owner in, and turns away staff and anonymous visitors', async () => {
    const owner = await login('owner'); const staff = await login('staff')
    expect((await owner('/analytics/summary?range=7d')).status).toBe(200)
    expect((await owner('/analytics/realtime')).status).toBe(200)
    expect((await staff('/analytics/summary')).status).toBe(403)
    expect((await staff('/analytics/realtime')).status).toBe(403)
    expect((await request(app).get('/api/admin/analytics/summary')).status).toBe(401)
    expect((await owner('/analytics/summary?range=year')).status).toBe(400)
  })
})

describe('when Google is not connected', () => {
  it('returns a clear "not connected" answer and still gives the exact shop numbers', async () => {
    const owner = await login('owner')
    const p = await packProduct()
    await order(p, { createdAt: hoursAgo(1) })
    const r = await owner('/analytics/summary?range=today')
    expect(r.body.ga).toMatchObject({ connected: false, reason: 'missing_credentials' })
    expect(r.body.shop.orders).toBe(1)
    expect((await owner('/analytics/realtime')).body).toMatchObject({ connected: false })
  })
  it('does not crash when Google errors', async () => {
    const owner = await login('owner')
    setGaClientForTests({ runReport: async () => { throw new Error('quota') }, runRealtimeReport: async () => { throw new Error('quota') } })
    const r = await owner('/analytics/summary')
    expect(r.status).toBe(200)
    expect(r.body.ga).toMatchObject({ connected: false, reason: 'google_error' })
  })
})

describe('Google numbers', () => {
  it('maps the report and keeps it for 60 seconds (realtime 30)', async () => {
    const owner = await login('owner')
    const fake = new FakeGa(); setGaClientForTests(fake)
    let t = 1_000_000; setClockForTests(() => t)
    const a = await owner('/analytics/summary?range=7d')
    expect(a.body.ga).toMatchObject({ connected: true, totalUsers: 120, newUsers: 80, returningUsers: 40, sessions: 150, avgEngagementSec: 30 })
    expect(a.body.ga.devices).toEqual({ mobile: 120, desktop: 30, tablet: 0 })
    expect(a.body.ga.cities).toEqual([{ label: 'Hyderabad', value: 60 }])
    expect(a.body.ga.funnel).toEqual({ view_item: 300, add_to_cart: 0, begin_checkout: 0, purchase: 12 })
    const used = fake.calls
    t += 59_000; await owner('/analytics/summary?range=7d')
    expect(fake.calls).toBe(used) // served from the cache
    await owner('/analytics/summary?range=30d')
    expect(fake.calls).toBeGreaterThan(used) // a different range is a different cache entry
    t += 2_000; const before = fake.calls; await owner('/analytics/summary?range=7d')
    expect(fake.calls).toBeGreaterThan(before) // older than 60 s: asked again
    expect((await owner('/analytics/realtime')).body).toEqual({ connected: true, activeNow: 7 })
    const rt = fake.calls; t += 29_000; await owner('/analytics/realtime'); expect(fake.calls).toBe(rt)
    t += 2_000; await owner('/analytics/realtime'); expect(fake.calls).toBe(rt + 1)
  })
})

describe('exact shop numbers from MongoDB', () => {
  it('counts sales, revenue, split, status, top products, buyers and days correctly', async () => {
    const owner = await login('owner')
    const a = await packProduct({ name: 'Dry anchovies' }); const b = await kgProduct({ name: 'Seer fish' })
    const cust = await Customer.create({ email: 'rep@t.test', name: 'Rep' })
    await order(a, { createdAt: hoursAgo(1) }, 2, 50000)                                                      // cod, 1000
    await order(b, { createdAt: hoursAgo(2), payment: { method: 'razorpay', status: 'paid' } }, 1, 90000)     // online, 900
    await order(a, { createdAt: hoursAgo(3), status: 'cancelled' }, 5, 50000)                                  // cancelled: not a sale
    await order(a, { createdAt: hoursAgo(4), payment: { method: 'razorpay', status: 'pending' } }, 1, 50000)   // unpaid: not a sale
    await order(a, { createdAt: hoursAgo(5), customerId: cust._id, status: 'delivered' }, 1, 50000)             // repeat buyer
    await order(a, { createdAt: new Date(Date.now() - 20 * 86_400_000), customerId: cust._id }, 1, 50000)     // earlier order by the same buyer
    const r = (await owner('/analytics/summary?range=today')).body.shop
    expect(r.orders).toBe(3)
    expect(r.revenue).toBe(100000 + 90000 + 50000)
    expect(r.avgOrderValue).toBe(80000)
    expect(r.paymentSplit).toEqual({ cod: { orders: 2, revenue: 150000 }, online: { orders: 1, revenue: 90000 } })
    expect(r.ordersByStatus).toMatchObject({ placed: 3, cancelled: 1, delivered: 1 })
    expect(r.topByQty[0]).toMatchObject({ name: 'Dry anchovies', qty: 3 })
    expect(r.topByRevenue.map((x: { name: string; revenue: number }) => [x.name, x.revenue])).toEqual([['Dry anchovies', 150000], ['Seer fish', 90000]])
    expect(r.repeatCustomers).toBe(1)
    expect(r.newCustomers).toBe(1) // the guest orders share one phone, so they are one buyer
    expect(r.signups).toBe(1)
    expect(r.perDay).toHaveLength(1)
    expect(r.perDay[0]).toMatchObject({ orders: 3, revenue: 240000 })
    const month = (await owner('/analytics/summary?range=30d')).body.shop
    expect(month.orders).toBe(4)
    expect(month.perDay).toHaveLength(30)
    expect(month.perDay.reduce((s: number, d: { orders: number }) => s + d.orders, 0)).toBe(4)
  })
})
