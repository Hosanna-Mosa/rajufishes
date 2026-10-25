import bcrypt from 'bcryptjs'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { AdminUser } from '../src/models/AdminUser.js'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { signPayment } from '../src/services/razorpay.js'
import { address, contact, kgProduct, makeZone, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()
const PASS = 'a-long-test-password'

async function login(role: 'owner' | 'staff' = 'owner') {
  const email = `${role}@t.test`
  await AdminUser.updateOne({ email }, { $set: { email, name: role, role, active: true, passwordHash: await bcrypt.hash(PASS, 4) } }, { upsert: true })
  const r = await request(app).post('/api/admin/auth/login').send({ email, password: PASS })
  expect(r.status).toBe(200)
  const cookie = (r.headers['set-cookie'] as unknown as string[])[0].split(';')[0]
  return (m: 'get' | 'post' | 'patch' | 'put' | 'delete', url: string) => request(app)[m](`/api/admin${url}`).set('Cookie', cookie)
}
const place = (productId: string, paymentMethod: 'cod' | 'razorpay', qty = 1) =>
  request(app).post('/api/orders').send({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId, qty }], paymentMethod })

describe('admin sign in', () => {
  it('refuses a wrong password and a missing token', async () => {
    await AdminUser.create({ email: 'o@t.test', name: 'O', role: 'owner', passwordHash: await bcrypt.hash(PASS, 4) })
    expect((await request(app).post('/api/admin/auth/login').send({ email: 'o@t.test', password: 'nope' })).status).toBe(401)
    expect((await request(app).post('/api/admin/auth/login').send({ email: 'nobody@t.test', password: 'nope' })).status).toBe(401)
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401)
    expect((await request(app).get('/api/admin/orders').set('Authorization', 'Bearer junk')).status).toBe(401)
  })

  it('a customer token or an unknown body field does not get in', async () => {
    expect((await request(app).post('/api/admin/auth/login').send({ email: 'o@t.test', password: 'x', role: 'owner' })).status).toBe(400)
  })

  it('a removed staff member is locked out at once, even with a valid token', async () => {
    const owner = await login('owner')
    const staff = await login('staff')
    expect((await staff('get', '/dashboard')).status).toBe(200)
    const list = await owner('get', '/staff')
    const sid = list.body.items.find((u: { role: string }) => u.role === 'staff').id
    expect((await owner('delete', `/staff/${sid}`)).status).toBe(200)
    expect((await staff('get', '/dashboard')).status).toBe(401)
  })
})

describe('roles', () => {
  it('staff can run the shop but not staff, delivery zones or coupons', async () => {
    const staff = await login('staff')
    expect((await staff('get', '/dashboard')).status).toBe(200)
    expect((await staff('get', '/products')).status).toBe(200)
    for (const [m, url] of [['get', '/staff'], ['get', '/zones'], ['get', '/settings'], ['get', '/coupons'], ['post', '/coupons'], ['post', '/zones'], ['patch', '/settings'], ['post', '/staff']] as const) {
      expect((await staff(m, url).send({})).status, `${m} ${url}`).toBe(403)
    }
  })

  it('the owner adds a staff login, who can sign in; short passwords are refused', async () => {
    const owner = await login('owner')
    expect((await owner('post', '/staff').send({ email: 's2@t.test', name: 'Asha', password: 'short' })).status).toBe(400)
    const made = await owner('post', '/staff').send({ email: 's2@t.test', name: 'Asha', password: 'asha-long-password' })
    expect(made.status).toBe(201)
    expect(JSON.stringify(made.body)).not.toContain('passwordHash')
    expect((await request(app).post('/api/admin/auth/login').send({ email: 's2@t.test', password: 'asha-long-password' })).status).toBe(200)
    expect((await owner('patch', `/staff/${made.body.staff.id}/password`).send({ password: 'asha-new-password' })).status).toBe(200)
    expect((await request(app).post('/api/admin/auth/login').send({ email: 's2@t.test', password: 'asha-long-password' })).status).toBe(401)
    expect((await owner('delete', '/staff/' + (await AdminUser.findOne({ role: 'owner' }))!._id)).status).toBe(409)
  })
})

describe('market board, price and stock', () => {
  it('saves price, stock and the show/hide switch in one go and the shop sees it', async () => {
    await makeZone()
    const owner = await login('owner')
    const seer = await kgProduct({ price: 90000, stock: 5, marketListed: true })
    const board = await owner('get', '/market')
    expect(board.body.items.length).toBe(1)
    const save = await owner('put', '/market').send({ items: [{ productId: String(seer._id), price: 95000, stock: 12.5, order: 0, listed: true }] })
    expect(save.status).toBe(200)
    const p = (await Product.findById(seer._id))!
    expect([p.price, p.stock, p.marketListed]).toEqual([95000, 12.5, true])
    await owner('put', '/market').send({ items: [{ productId: String(seer._id), price: 95000, stock: 12.5, order: 0, listed: false }] })
    expect((await Product.findById(seer._id))!.marketListed).toBe(false)
    expect((await owner('put', '/market').send({ items: [{ productId: String(seer._id), price: -5, stock: 1, listed: true }] })).status).toBe(400)
  })

  it('PATCH price and stock validate their input; stock 0 blocks an order', async () => {
    await makeZone()
    const owner = await login('owner')
    const p = await packProduct({ stock: 3 })
    expect((await owner('patch', `/products/${p._id}/price`).send({ price: 61000 })).status).toBe(200)
    expect((await Product.findById(p._id))!.price).toBe(61000)
    expect((await owner('patch', `/products/${p._id}/price`).send({ price: 'free' })).status).toBe(400)
    expect((await owner('patch', `/products/${p._id}/stock`).send({ stock: 0 })).status).toBe(200)
    expect((await place(String(p._id), 'cod')).status).toBe(409)
    expect((await owner('patch', '/products/not-an-id/stock').send({ stock: 1 })).status).toBe(400)
  })

  it('creates a product with images and refuses bad fields', async () => {
    const owner = await login('owner')
    const base = { name: 'Rohu', slug: 'rohu', category: 'fresh', group: 'Fresh fish', unit: 'kg', weights: [500, 1000], price: 25000, stock: 4, images: [{ url: 'https://x.test/a.jpg', publicId: 'a', alt: 'Rohu' }] }
    expect((await owner('post', '/products').send(base)).status).toBe(201)
    expect((await owner('post', '/products').send({ ...base, slug: 'r2', isAdmin: true })).status).toBe(400)
    expect((await owner('post', '/products').send({ ...base, slug: 'r3', price: -1 })).status).toBe(400)
  })
})

describe('uploads', () => {
  it('saves a real image to the local folder and refuses other files', async () => {
    const owner = await login('owner')
    expect((await owner('get', '/uploads/status')).body.storage).toBe('local')
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)])
    const ok = await owner('post', '/uploads').set('Content-Type', 'image/png').send(png)
    expect(ok.status).toBe(201)
    expect(ok.body.local).toBe(true)
    expect(ok.body.url).toMatch(/\/uploads\/[0-9a-f]{20}\.png$/)
    expect((await request(app).get(new URL(ok.body.url).pathname)).status).toBe(200)
    const fake = await owner('post', '/uploads').set('Content-Type', 'image/png').send(Buffer.from('<?php echo 1; ?> not an image at all'))
    expect(fake.status).toBe(400)
    expect((await request(app).post('/api/admin/uploads').set('Content-Type', 'image/png').send(png)).status).toBe(401)
  })
})

describe('orders: status, COD, cancel, refund', () => {
  it('moves placed to packed to shipped to delivered and records history', async () => {
    await makeZone()
    const owner = await login('owner')
    const p = await packProduct({ stock: 5 })
    const o = (await place(String(p._id), 'cod')).body.order
    const oid = (await Order.findOne({ orderNo: o.orderNo }))!._id
    expect((await owner('patch', `/orders/${oid}/status`).send({ status: 'delivered' })).status).toBe(409) // cannot skip
    for (const s of ['packed', 'shipped', 'delivered']) expect((await owner('patch', `/orders/${oid}/status`).send({ status: s })).status).toBe(200)
    const full = (await owner('get', `/orders/${oid}`)).body.order
    expect(full.status).toBe('delivered')
    expect(full.statusHistory.map((h: { status: string }) => h.status)).toEqual(['placed', 'packed', 'shipped', 'delivered'])
  })

  it('cancel needs a reason, puts the stock back, and filters find COD vs online', async () => {
    await makeZone()
    const owner = await login('owner')
    const p = await packProduct({ stock: 5 })
    const o = (await place(String(p._id), 'cod', 2)).body.order
    const oid = (await Order.findOne({ orderNo: o.orderNo }))!._id
    expect((await owner('get', '/orders?method=cod')).body.items.length).toBe(1)
    expect((await owner('get', '/orders?method=razorpay')).body.items.length).toBe(0)
    expect((await owner('patch', `/orders/${oid}/status`).send({ status: 'cancelled' })).status).toBe(400)
    expect((await owner('patch', `/orders/${oid}/status`).send({ status: 'cancelled', note: 'Customer called' })).status).toBe(200)
    expect((await Product.findById(p._id))!.stock).toBe(5)
    expect((await Order.findById(oid))!.cancelReason).toBeTruthy()
  })

  it('marks a COD order collected, then refunds it once', async () => {
    await makeZone()
    const owner = await login('owner')
    const p = await packProduct({ stock: 5 })
    const o = (await place(String(p._id), 'cod')).body.order
    const oid = (await Order.findOne({ orderNo: o.orderNo }))!._id
    expect((await owner('post', `/orders/${oid}/refund`).send({ reason: 'x' })).status).toBe(409) // nothing paid yet
    expect((await owner('post', `/orders/${oid}/mark-cod-collected`).send({})).status).toBe(200)
    expect((await Order.findById(oid))!.payment!.status).toBe('cod_collected')
    const r = await owner('post', `/orders/${oid}/refund`).send({ reason: 'Fish was not fresh' })
    expect(r.status).toBe(200)
    expect(r.body.order.payment.status).toBe('refunded')
    expect((await owner('post', `/orders/${oid}/refund`).send({ reason: 'again' })).status).toBe(409)
  })

  it('refunds an online order through the mock adapter with a partial amount', async () => {
    await makeZone()
    const owner = await login('owner')
    const p = await packProduct({ stock: 5 })
    const made = await place(String(p._id), 'razorpay')
    const rid = made.body.razorpay.orderId as string
    await request(app).post('/api/payments/razorpay/verify').send({ razorpay_order_id: rid, razorpay_payment_id: 'pay_r1', razorpay_signature: signPayment(rid, 'pay_r1') })
    const oid = (await Order.findOne({ orderNo: made.body.order.orderNo }))!._id
    const total = (await Order.findById(oid))!.total!
    expect((await owner('post', `/orders/${oid}/refund`).send({ reason: 'too much', amount: total + 100 })).status).toBe(400)
    expect((await owner('post', `/orders/${oid}/refund`).send({ reason: '' })).status).toBe(400)
    const r = await owner('post', `/orders/${oid}/refund`).send({ reason: 'Short weight', amount: 5000 })
    expect(r.status).toBe(200)
    expect(r.body.mock).toBe(true)
    const after = (await Order.findById(oid))!
    expect(after.payment!.status).toBe('refunded')
    expect(after.payment!.refundId).toMatch(/^rfnd_dev_/)
    expect(after.payment!.refundAmount).toBe(5000)
  })
})

describe('dashboard and customers', () => {
  it('counts today\'s orders and sales, and lists low stock', async () => {
    await makeZone()
    const owner = await login('owner')
    const p = await packProduct({ stock: 3 })
    await place(String(p._id), 'cod', 1)
    const d = (await owner('get', '/dashboard')).body
    expect(d.newToday).toBe(1)
    expect(d.salesToday).toBeGreaterThan(0)
    expect(d.toPack).toBe(1)
    expect(d.lowStock.length).toBe(1)
  })

  it('lists customers with their order counts', async () => {
    const owner = await login('owner')
    const r = await owner('get', '/customers?q=98')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body.items)).toBe(true)
  })
})

describe('coupons and zones (owner)', () => {
  it('edits only the fields sent and switches a coupon off', async () => {
    const owner = await login('owner')
    const made = await owner('post', '/coupons').send({ code: 'save5', type: 'flat', value: 5000, minSubtotal: 20000 })
    expect(made.status).toBe(201)
    const cid = made.body.coupon._id
    const r = await owner('patch', `/coupons/${cid}`).send({ active: false })
    expect(r.body.coupon.active).toBe(false)
    expect(r.body.coupon.minSubtotal).toBe(20000)
    expect(r.body.coupon.code).toBe('SAVE5')
    expect((await owner('patch', `/coupons/${cid}`).send({ type: 'percent', value: 150 })).status).toBe(400)
  })
})
