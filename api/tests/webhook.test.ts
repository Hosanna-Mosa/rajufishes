import crypto from 'node:crypto'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { expireHolds } from '../src/services/stock.js'
import { address, contact, makeZone, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()
// the same fixed development secret the API uses when RAZORPAY_WEBHOOK_SECRET is empty
const sign = (raw: string) => crypto.createHmac('sha256', 'dev_only_razorpay_secret').update(raw).digest('hex')
const place = (productId: string) =>
  request(app).post('/api/orders').send({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId, qty: 2 }], paymentMethod: 'razorpay' })

describe('Razorpay webhook', () => {
  it('payment.captured with a good signature marks the order paid, once', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const made = await place(String(p._id))
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_wh_1', order_id: made.body.razorpay.orderId } } } })
    const hit = () => request(app).post('/api/payments/razorpay/webhook').set('content-type', 'application/json').set('x-razorpay-signature', sign(raw)).send(raw)
    expect((await hit()).status).toBe(200)
    expect((await hit()).status).toBe(200) // Razorpay retries: harmless
    const o = (await Order.findOne({ orderNo: made.body.order.orderNo }))!
    expect(o.payment!.status).toBe('paid')
    expect(o.payment!.razorpayPaymentId).toBe('pay_wh_1')
    expect((await Product.findById(p._id))!.stock).toBe(8)
  })

  it('a wrong signature is refused and changes nothing', async () => {
    await makeZone()
    const p = await packProduct()
    const made = await place(String(p._id))
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_wh_2', order_id: made.body.razorpay.orderId } } } })
    const r = await request(app).post('/api/payments/razorpay/webhook').set('content-type', 'application/json').set('x-razorpay-signature', sign(raw + ' ')).send(raw)
    expect(r.status).toBe(400)
    expect((await Order.findOne({ orderNo: made.body.order.orderNo }))!.payment!.status).toBe('pending')
  })
})

describe('30 minute stock hold', () => {
  it('cancels an unpaid online order after the hold and puts the stock back; paid and COD orders stay', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const unpaid = await place(String(p._id))
    const cod = await request(app).post('/api/orders').send({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId: String(p._id), qty: 1 }], paymentMethod: 'cod' })
    expect((await Product.findById(p._id))!.stock).toBe(7)
    expect(await expireHolds(new Date())).toBe(0) // still inside the 30 minutes
    expect(await expireHolds(new Date(Date.now() + 31 * 60_000))).toBe(1)
    const o = (await Order.findOne({ orderNo: unpaid.body.order.orderNo }))!
    expect(o.status).toBe('cancelled')
    expect(o.stockState).toBe('released')
    expect((await Product.findById(p._id))!.stock).toBe(9) // the COD order still holds its 1
    expect((await Order.findOne({ orderNo: cod.body.order.orderNo }))!.status).toBe('placed')
    expect(await expireHolds(new Date(Date.now() + 60 * 60_000))).toBe(0) // not twice
  })
})
