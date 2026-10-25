import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import { mailer } from '../src/services/mail.js'
import { signPayment } from '../src/services/razorpay.js'
import { address, contact, makeZone, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()
const body = (id: string, paymentMethod: 'cod' | 'razorpay') => ({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId: id, qty: 1 }], paymentMethod })

beforeEach(() => { env.OWNER_EMAIL = 'owner@example.test' })
afterEach(() => { env.OWNER_EMAIL = ''; vi.restoreAllMocks() })

describe('new order email', () => {
  it('is sent for a cash on delivery order, with the details the family needs', async () => {
    const send = vi.spyOn(mailer, 'send').mockResolvedValue()
    await makeZone()
    const p = await packProduct()
    const r = await request(app).post('/api/orders').send(body(String(p._id), 'cod'))
    expect(r.status).toBe(201)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    const mail = send.mock.calls[0][0]
    expect(mail.to).toBe('owner@example.test')
    expect(mail.subject).toContain(r.body.order.orderNo)
    for (const bit of ['Test Buyer', '9876543210', 'Hyderabad', 'Dry anchovies x 1', 'Cash on delivery', 'tomorrow_morning', 'Total:']) expect(mail.text).toContain(bit)
  })

  it('is sent once an online order is paid, and not before', async () => {
    const send = vi.spyOn(mailer, 'send').mockResolvedValue()
    await makeZone()
    const p = await packProduct()
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'razorpay'))
    await new Promise((r) => setTimeout(r, 50))
    expect(send).not.toHaveBeenCalled()
    const rid = made.body.razorpay.orderId as string
    await request(app).post('/api/payments/razorpay/verify').send({ razorpay_order_id: rid, razorpay_payment_id: 'pay_1', razorpay_signature: signPayment(rid, 'pay_1') })
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(send.mock.calls[0][0].text).toContain('Paid online')
  })

  it('is not sent when the payment fails', async () => {
    const send = vi.spyOn(mailer, 'send').mockResolvedValue()
    await makeZone()
    const p = await packProduct()
    const made = await request(app).post('/api/orders').send(body(String(p._id), 'razorpay'))
    const rid = made.body.razorpay.orderId as string
    const bad = await request(app).post('/api/payments/razorpay/verify').send({ razorpay_order_id: rid, razorpay_payment_id: 'pay_1', razorpay_signature: 'deadbeef' })
    expect(bad.status).toBe(400)
    await new Promise((r) => setTimeout(r, 50))
    expect(send).not.toHaveBeenCalled()
  })

  it('never fails the order when the mail server breaks', async () => {
    const send = vi.spyOn(mailer, 'send').mockRejectedValue(new Error('smtp down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await makeZone()
    const p = await packProduct()
    const r = await request(app).post('/api/orders').send(body(String(p._id), 'cod'))
    expect(r.status).toBe(201)
    await vi.waitFor(() => expect(send).toHaveBeenCalled())
  })
})
