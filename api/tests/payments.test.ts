import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { signPayment } from '../src/services/razorpay.js'
import { address, contact, makeZone, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()

const body = (productId: string, paymentMethod: 'cod' | 'razorpay', qty = 2) =>
  ({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId, qty }], paymentMethod })
const stockOf = async (id: unknown) => (await Product.findById(id))!.stock

describe('payment verification', () => {
  it('marks the order paid for a valid signature and keeps the stock', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'razorpay'))
    expect(made.status).toBe(201)
    expect(made.body.razorpay.mock).toBe(true)
    const rid = made.body.razorpay.orderId as string
    const sig = signPayment(rid, 'pay_test_1')
    const ok = await request(app).post('/api/payments/razorpay/verify').send({ razorpay_order_id: rid, razorpay_payment_id: 'pay_test_1', razorpay_signature: sig })
    expect(ok.status).toBe(200)
    expect(ok.body.order.payment.status).toBe('paid')
    expect(ok.body.order.stockState).toBe('committed')
    expect(await stockOf(p._id)).toBe(8)
  })

  it('rejects a wrong signature and leaves the order unpaid and held', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'razorpay'))
    const rid = made.body.razorpay.orderId as string
    const bad = await request(app).post('/api/payments/razorpay/verify').send({ razorpay_order_id: rid, razorpay_payment_id: 'pay_x', razorpay_signature: 'deadbeef' })
    expect(bad.status).toBe(400)
    // a signature made for a different payment id does not work either
    const other = await request(app).post('/api/payments/razorpay/verify').send({ razorpay_order_id: rid, razorpay_payment_id: 'pay_y', razorpay_signature: signPayment(rid, 'pay_other') })
    expect(other.status).toBe(400)
    const o = await Order.findOne({ orderNo: made.body.order.orderNo })
    expect(o!.payment!.status).toBe('pending')
    expect(o!.stockState).toBe('held')
  })

  it('paying twice is harmless', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'razorpay'))
    const rid = made.body.razorpay.orderId as string
    const send = () => request(app).post('/api/payments/razorpay/verify').send({ razorpay_order_id: rid, razorpay_payment_id: 'pay_1', razorpay_signature: signPayment(rid, 'pay_1') })
    expect((await send()).status).toBe(200)
    expect((await send()).status).toBe(200)
    expect(await stockOf(p._id)).toBe(8)
  })

  it('the mock payment endpoint signs a payment that verifies, and a retry gets a payment window again', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'razorpay'))
    const again = await request(app).post(`/api/orders/${made.body.order.orderNo}/pay`).send({ token: made.body.trackToken })
    expect(again.status).toBe(200)
    expect(again.body.razorpay.orderId).toBe(made.body.razorpay.orderId)
    const mock = await request(app).post('/api/payments/mock/pay').send({ razorpay_order_id: again.body.razorpay.orderId })
    const ok = await request(app).post('/api/payments/razorpay/verify').send(mock.body)
    expect(ok.status).toBe(200)
    expect(ok.body.order.payment.status).toBe('paid')
    // nothing left to pay
    expect((await request(app).post(`/api/orders/${made.body.order.orderNo}/pay`).send({ token: made.body.trackToken })).status).toBe(409)
  })
})

describe('cash on delivery and cancelling', () => {
  it('COD places the order straight away as placed / cod_due with a private tracking link', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'cod', 3))
    expect(made.status).toBe(201)
    expect(made.body.razorpay).toBeNull()
    expect(made.body.order.status).toBe('placed')
    expect(made.body.order.payment.status).toBe('cod_due')
    expect(made.body.order.total).toBe(3 * 50000)
    expect(await stockOf(p._id)).toBe(7)
    const track = await request(app).get('/api/orders/track').query({ orderNo: made.body.order.orderNo, token: made.body.trackToken })
    expect(track.status).toBe(200)
    expect((await request(app).get('/api/orders/track').query({ orderNo: made.body.order.orderNo, token: 'nope' })).status).toBe(404)
  })

  it('cancelling a placed order puts the stock back, and a second cancel is refused', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'cod', 4))
    expect(await stockOf(p._id)).toBe(6)
    const no = made.body.order.orderNo
    const cancel = await request(app).post(`/api/orders/${no}/cancel`).send({ token: made.body.trackToken })
    expect(cancel.status).toBe(200)
    expect(cancel.body.order.status).toBe('cancelled')
    expect(await stockOf(p._id)).toBe(10)
    expect((await request(app).post(`/api/orders/${no}/cancel`).send({ token: made.body.trackToken })).status).toBe(409)
    expect(await stockOf(p._id)).toBe(10)
  })

  it('a stranger cannot cancel or see an order', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'cod'))
    const no = made.body.order.orderNo
    expect((await request(app).post(`/api/orders/${no}/cancel`).send({})).status).toBe(404)
    expect((await request(app).get(`/api/orders/${no}`)).status).toBe(404)
  })
})

describe('saved cart', () => {
  it('merges the browser cart into the account', async () => {
    const sent = await request(app).post('/api/auth/otp/send').send({ phone: '9876543210' })
    expect(sent.status).toBe(200)
    const v = await request(app).post('/api/auth/otp/verify').send({ phone: '9876543210', code: '123456' })
    const cookie = v.headers['set-cookie']
    const id = '64b7f0c2a1b2c3d4e5f60718'
    const a = await request(app).post('/api/me/cart/merge').set('Cookie', cookie).send({ items: [{ productId: id, slug: 's', qty: 2 }] })
    expect(a.body.items).toHaveLength(1)
    const b = await request(app).post('/api/me/cart/merge').set('Cookie', cookie).send({ items: [{ productId: id, slug: 's', qty: 3 }] })
    expect(b.body.items[0].qty).toBe(5)
    expect((await request(app).get('/api/me/cart')).status).toBe(401)
  })
})
