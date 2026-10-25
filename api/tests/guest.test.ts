import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import { address, contact, makeZone, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()
beforeAll(() => { env.LOGIN_MODE = 'guest' })
afterAll(() => { env.LOGIN_MODE = 'otp' })

const place = (id: string) => request(app).post('/api/orders').send({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId: id, qty: 1 }], paymentMethod: 'cod' })

describe('guest only login mode', () => {
  it('checkout works with just name, phone and address, and gives a tracking link token', async () => {
    await makeZone()
    const p = await packProduct()
    const r = await place(String(p._id))
    expect(r.status).toBe(201)
    expect(r.body.trackToken).toBeTruthy()
    expect(r.body.order.customerId).toBeNull()
  })

  it('tracks through the private link', async () => {
    await makeZone()
    const p = await packProduct()
    const r = await place(String(p._id))
    const t = await request(app).get('/api/orders/track').query({ orderNo: r.body.order.orderNo, token: r.body.trackToken })
    expect(t.status).toBe(200)
    expect(t.body.order.orderNo).toBe(r.body.order.orderNo)
    const bad = await request(app).get('/api/orders/track').query({ orderNo: r.body.order.orderNo, token: 'nope' })
    expect(bad.status).toBe(404)
  })

  it('tracks through order number and phone, and refuses a wrong phone', async () => {
    await makeZone()
    const p = await packProduct()
    const r = await place(String(p._id))
    const ok = await request(app).post('/api/orders/lookup').send({ orderNo: `#${r.body.order.orderNo}`, phone: '98765 43210' })
    expect(ok.status).toBe(200)
    expect(ok.body.order.orderNo).toBe(r.body.order.orderNo)
    expect(ok.body.trackToken).toBeTruthy()
    expect(ok.body.order.adminNote).toBeUndefined()
    const wrong = await request(app).post('/api/orders/lookup').send({ orderNo: r.body.order.orderNo, phone: '9000000099' })
    expect(wrong.status).toBe(404)
  })

  it('answers the phone code routes with a clear "switched off" message', async () => {
    const s = await request(app).post('/api/auth/otp/send').send({ phone: '9876543210' })
    expect(s.status).toBe(403)
    expect(s.body.error).toMatch(/switched off/)
    const v = await request(app).post('/api/auth/otp/verify').send({ phone: '9876543210', code: '123456' })
    expect(v.status).toBe(403)
  })

  it('tells the website which mode it is in', async () => {
    const r = await request(app).get('/api/meta/site')
    expect(r.body.loginMode).toBe('guest')
  })
})
