import bcrypt from 'bcryptjs'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { AdminUser } from '../src/models/AdminUser.js'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { istDay, istDaysBetween } from '../src/services/ist.js'
import { address, contact, kgProduct, makeZone, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()

async function admin() {
  await AdminUser.updateOne({ email: 'o@t.test' }, { $set: { email: 'o@t.test', name: 'o', role: 'owner', active: true, passwordHash: await bcrypt.hash('a-long-test-password', 4) } }, { upsert: true })
  const r = await request(app).post('/api/admin/auth/login').send({ email: 'o@t.test', password: 'a-long-test-password' })
  const cookie = (r.headers['set-cookie'] as unknown as string[])[0].split(';')[0]
  return (m: 'get' | 'post' | 'patch', url: string) => request(app)[m](`/api/admin${url}`).set('Cookie', cookie)
}

describe('IST day boundary', () => {
  it('11:59 PM IST is still the same day, 12:01 AM IST is the next', () => {
    const late = new Date('2026-10-25T18:29:00Z') // 23:59 IST on 25 Oct
    const after = new Date('2026-10-25T18:31:00Z') // 00:01 IST on 26 Oct
    expect(istDay(late)).toBe('2026-10-25')
    expect(istDay(after)).toBe('2026-10-26')
    expect(istDaysBetween(late, late)).toBe(0)
    expect(istDaysBetween(late, after)).toBe(1) // two minutes apart, but a different shop day
    expect(istDaysBetween(new Date('2026-10-25T00:00:00Z'), new Date('2026-10-25T18:29:00Z'))).toBe(0)
  })
})

describe('fresh dates on products', () => {
  it('a new product gets addedOn by default and no invented caught date', async () => {
    const a = await admin()
    const r = await a('post', '/products').send({ name: 'Rohu', category: 'fresh', group: 'Fresh fish', unit: 'kg', price: 20000, weights: [1000], stock: 5 })
    expect(r.status).toBe(201)
    expect(r.body.product.addedOn).toBeTruthy()
    expect(r.body.product.landedAt).toBeUndefined()
    const pub = await request(app).get(`/api/products/${r.body.product.slug}`)
    expect(pub.body.product.caughtOn).toBeNull()
    expect(pub.body.product.addedOn).toBeTruthy()
  })

  it('an admin can set both dates and the shop shows them', async () => {
    const a = await admin()
    const p = await kgProduct()
    const r = await a('patch', `/products/${p._id}`).send({ landedAt: '2026-10-24T00:30:00Z', addedOn: '2026-10-25T04:00:00Z' })
    expect(r.status).toBe(200)
    const pub = await request(app).get(`/api/products/${p.slug}`)
    expect(pub.body.product.caughtOn).toBe('2026-10-24T00:30:00.000Z')
    expect(pub.body.product.addedOn).toBe('2026-10-25T04:00:00.000Z')
  })

  it('dry and frozen items never carry a fresh day', async () => {
    const a = await admin()
    const d = await packProduct()
    expect((await a('post', `/products/${d._id}/landed-today`)).status).toBe(400)
    await a('patch', `/products/${d._id}`).send({ landedAt: '2026-10-24T00:30:00Z' })
    const pub = await request(app).get(`/api/products/${d.slug}`)
    expect(pub.body.product.caughtOn).toBeNull()
    expect(pub.body.product.addedOn).toBeNull()
  })

  it('"Landed today" and the bulk action stamp fresh items only', async () => {
    const a = await admin()
    const f1 = await kgProduct({ landedAt: new Date('2026-01-01T00:00:00Z') })
    const f2 = await kgProduct()
    const d = await packProduct()
    const one = await a('post', `/products/${f1._id}/landed-today`)
    expect(istDay(one.body.product.landedAt)).toBe(istDay())
    const bulk = await a('post', '/products/mark-caught').send({ ids: [String(f2._id), String(d._id)] })
    expect(bulk.body.updated).toBe(1)
    expect(istDay((await Product.findById(f2._id))!.landedAt!)).toBe(istDay())
    expect((await Product.findById(d._id))!.landedAt).toBeUndefined()
    expect((await a('post', '/products/mark-caught').send({ ids: [] })).status).toBe(400)
  })

  it('only a signed-in admin can change them', async () => {
    const p = await kgProduct()
    expect((await request(app).post(`/api/admin/products/${p._id}/landed-today`)).status).toBe(401)
    expect((await request(app).post('/api/admin/products/mark-caught').send({ ids: [String(p._id)] })).status).toBe(401)
    expect((await request(app).patch(`/api/admin/products/${p._id}`).send({ landedAt: '2026-10-24T00:30:00Z' })).status).toBe(401)
  })

  it('an order keeps a snapshot of the dates, so the line stays true later', async () => {
    await makeZone()
    const a = await admin()
    const p = await kgProduct({ stock: 50, landedAt: new Date('2026-10-24T00:30:00Z'), addedOn: new Date('2026-10-25T04:00:00Z') })
    const r = await request(app).post('/api/orders').send({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId: String(p._id), qty: 1, weightG: 1000, cut: 'Steaks' }], paymentMethod: 'cod' })
    expect(r.status).toBe(201)
    await a('patch', `/products/${p._id}`).send({ landedAt: '2026-11-01T00:30:00Z' })
    const o = await Order.findOne({ orderNo: r.body.order.orderNo }).lean()
    expect(o!.items[0].caughtOn!.toISOString()).toBe('2026-10-24T00:30:00.000Z')
    expect(o!.items[0].addedOn!.toISOString()).toBe('2026-10-25T04:00:00.000Z')
  })
})
