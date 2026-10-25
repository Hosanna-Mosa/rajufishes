import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import { Customer, PasswordReset } from '../src/models/Customer.js'
import { Order } from '../src/models/Order.js'
import { mailer } from '../src/services/mail.js'
import { address, contact, makeZone, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()
beforeAll(() => { env.LOGIN_MODE = 'account' })
afterAll(() => { env.LOGIN_MODE = 'otp' })
afterEach(() => { vi.restoreAllMocks(); delete process.env.RATE_LIMIT_TEST })

const good = { name: 'Asha Rao', email: 'Asha@Example.com', password: 'tide-pool-42', confirm: 'tide-pool-42' }
const signup = (over: Record<string, unknown> = {}) => request(app).post('/api/auth/signup').send({ ...good, ...over })
const cookieOf = (r: request.Response) => (r.headers['set-cookie'] as unknown as string[])[0]
const place = (id: string, cookie?: string, c: Record<string, unknown> = contact) => {
  const rq = request(app).post('/api/orders')
  if (cookie) rq.set('Cookie', cookie.split(';')[0])
  return rq.send({ contact: c, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId: id, qty: 1 }], paymentMethod: 'cod' })
}

describe('sign up', () => {
  it('creates an account, stores a bcrypt hash (cost 12), and signs in with a safe cookie', async () => {
    const r = await signup()
    expect(r.status).toBe(201)
    expect(r.body.customer.email).toBe('asha@example.com')
    expect(JSON.stringify(r.body)).not.toMatch(/tide-pool|passwordHash/)
    const ck = cookieOf(r)
    expect(ck).toMatch(/rf_customer=/)
    expect(ck).toMatch(/HttpOnly/)
    expect(ck).toMatch(/SameSite=Lax/)
    expect(ck).toMatch(/Max-Age=604800/) // 7 days
    const row = (await Customer.findOne({ email: 'asha@example.com' }).select('+passwordHash').lean())!
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/)
    expect(JSON.stringify(row)).not.toContain('tide-pool-42')
  })

  it('marks the cookie secure in production', async () => {
    const { cookieOpts } = await import('../src/middleware/common.js')
    expect(cookieOpts(1000)).toMatchObject({ httpOnly: true, sameSite: 'lax' })
    expect(typeof cookieOpts(1000).secure).toBe('boolean')
  })

  it('refuses a second account with the same email, in any letter case', async () => {
    await signup()
    const dup = await signup({ email: 'ASHA@example.com' })
    expect(dup.status).toBe(409)
  })

  it('refuses weak passwords and mismatched confirmation', async () => {
    expect((await signup({ password: 'short1', confirm: 'short1' })).status).toBe(400)
    expect((await signup({ password: 'onlyletters', confirm: 'onlyletters' })).status).toBe(400)
    expect((await signup({ confirm: 'different-pass-1' })).status).toBe(400)
    expect((await signup({ email: 'not-an-email' })).status).toBe(400)
    expect((await signup({ extra: 1 })).status).toBe(400)
  })
})

describe('sign in', () => {
  it('signs in with email and password and opens /me', async () => {
    await signup()
    const r = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'tide-pool-42' })
    expect(r.status).toBe(200)
    const me = await request(app).get('/api/me').set('Cookie', cookieOf(r).split(';')[0])
    expect(me.body.customer.name).toBe('Asha Rao')
  })

  it('gives the same generic message for a wrong password and an unknown email', async () => {
    await signup()
    const a = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'wrong-pass-99' })
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-pass-99' })
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)
    expect(a.body.error).toBe('Email or password is wrong')
    expect(b.body).toEqual(a.body)
  })

  it('limits tries per address and email: the sixth is refused', async () => {
    process.env.RATE_LIMIT_TEST = '1'
    const email = 'limit@example.com'
    let last = 0
    for (let i = 0; i < 6; i++) last = (await request(app).post('/api/auth/login').send({ email, password: 'wrong-pass-99' })).status
    expect(last).toBe(429)
    const other = await request(app).post('/api/auth/login').send({ email: 'other@example.com', password: 'wrong-pass-99' })
    expect(other.status).toBe(401) // a different email has its own count
  })

  it('signs out by clearing the cookie', async () => {
    const r = await request(app).post('/api/auth/logout')
    expect(r.headers['set-cookie']?.[0]).toContain('rf_customer=;')
  })
})

describe('protected routes', () => {
  it('refuse a request with no cookie or a bad one', async () => {
    for (const [m, u] of [['get', '/api/me'], ['get', '/api/orders'], ['get', '/api/me/addresses'], ['post', '/api/me/password'], ['post', '/api/me/orders/claim']] as const) {
      expect((await request(app)[m](u)).status).toBe(401)
    }
    expect((await request(app).get('/api/me').set('Cookie', 'rf_customer=junk')).status).toBe(401)
  })
})

describe('forgot and reset password', () => {
  const mailed = () => {
    const send = vi.spyOn(mailer, 'send').mockResolvedValue()
    return { send, token: () => /token=([\w-]+)/.exec(send.mock.calls[0][0].text)![1] }
  }

  it('emails a link, sets a new password once, and then refuses the same link', async () => {
    await signup()
    const m = mailed()
    const f = await request(app).post('/api/auth/forgot').send({ email: 'asha@example.com' })
    expect(f.status).toBe(200)
    await vi.waitFor(() => expect(m.send).toHaveBeenCalledTimes(1))
    expect(m.send.mock.calls[0][0].to).toBe('asha@example.com')
    const token = m.token()
    const stored = (await PasswordReset.findOne().lean())!
    expect(JSON.stringify(stored)).not.toContain(token) // only a hash is kept
    const set = await request(app).post('/api/auth/reset').send({ token, password: 'new-harbour-77', confirm: 'new-harbour-77' })
    expect(set.status).toBe(200)
    expect((await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'tide-pool-42' })).status).toBe(401)
    expect((await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'new-harbour-77' })).status).toBe(200)
    const again = await request(app).post('/api/auth/reset').send({ token, password: 'third-try-99', confirm: 'third-try-99' })
    expect(again.status).toBe(400)
  })

  it('refuses an expired link', async () => {
    await signup()
    const m = mailed()
    await request(app).post('/api/auth/forgot').send({ email: 'asha@example.com' })
    await vi.waitFor(() => expect(m.send).toHaveBeenCalled())
    await PasswordReset.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })
    const r = await request(app).post('/api/auth/reset').send({ token: m.token(), password: 'new-harbour-77', confirm: 'new-harbour-77' })
    expect(r.status).toBe(400)
    expect(r.body.error).toMatch(/expired/)
  })

  it('answers the same for an unknown email and sends nothing', async () => {
    const m = mailed()
    const r = await request(app).post('/api/auth/forgot').send({ email: 'ghost@example.com' })
    expect(r.status).toBe(200)
    expect(r.body.ok).toBe(true)
    expect(m.send).not.toHaveBeenCalled()
  })

  it('gives the link 30 minutes', async () => {
    await signup()
    mailed()
    await request(app).post('/api/auth/forgot').send({ email: 'asha@example.com' })
    const rec = (await PasswordReset.findOne().lean())!
    const mins = (rec.expiresAt.getTime() - Date.now()) / 60000
    expect(mins).toBeGreaterThan(29)
    expect(mins).toBeLessThanOrEqual(30)
  })
})

describe('change password', () => {
  it('needs the current password', async () => {
    const ck = cookieOf(await signup()).split(';')[0]
    const bad = await request(app).post('/api/me/password').set('Cookie', ck).send({ current: 'wrong-pass-99', password: 'new-harbour-77', confirm: 'new-harbour-77' })
    expect(bad.status).toBe(400)
    const ok = await request(app).post('/api/me/password').set('Cookie', ck).send({ current: 'tide-pool-42', password: 'new-harbour-77', confirm: 'new-harbour-77' })
    expect(ok.status).toBe(200)
    expect(await bcrypt.compare('new-harbour-77', (await Customer.findOne().select('+passwordHash'))!.passwordHash!)).toBe(true)
  })
})

describe('orders and accounts', () => {
  it('links an order placed while signed in to the account, and lists it', async () => {
    await makeZone()
    const p = await packProduct()
    const ck = cookieOf(await signup()).split(';')[0]
    const r = await place(String(p._id), ck)
    expect(r.status).toBe(201)
    expect(r.body.order.customerId).toBeTruthy()
    const list = await request(app).get('/api/orders').set('Cookie', ck)
    expect(list.body.orders).toHaveLength(1)
  })

  it('leaves a guest order as it was', async () => {
    await makeZone()
    const p = await packProduct()
    const r = await place(String(p._id))
    expect(r.body.order.customerId).toBeNull()
    expect(r.body.trackToken).toBeTruthy()
  })

  it('lets a new account claim an earlier guest order only with the order number and phone', async () => {
    await makeZone()
    const p = await packProduct()
    const g = await place(String(p._id), undefined, { ...contact, email: 'asha@example.com' })
    const ck = cookieOf(await signup()).split(';')[0]
    const no = g.body.order.orderNo
    expect((await request(app).get('/api/orders').set('Cookie', ck)).body.orders).toHaveLength(0)
    expect((await request(app).post('/api/me/orders/claim').set('Cookie', ck).send({ orderNo: no, phone: '9000000099' })).status).toBe(404)
    expect((await request(app).post('/api/me/orders/claim').set('Cookie', ck).send({ orderNo: no, phone: contact.phone })).status).toBe(200)
    expect((await request(app).get('/api/orders').set('Cookie', ck)).body.orders).toHaveLength(1)
    expect((await Order.findOne({ orderNo: no }))!.guestPhone).toBeNull()
  })

  it('refuses to claim a guest order that carries a different email', async () => {
    await makeZone()
    const p = await packProduct()
    const g = await place(String(p._id), undefined, { ...contact, email: 'someone@else.com' })
    const ck = cookieOf(await signup()).split(';')[0]
    const r = await request(app).post('/api/me/orders/claim').set('Cookie', ck).send({ orderNo: g.body.order.orderNo, phone: contact.phone })
    expect(r.status).toBe(404)
  })
})

describe('login mode', () => {
  it('switches the account routes off in guest mode and the phone code stays off', async () => {
    env.LOGIN_MODE = 'guest'
    try {
      expect((await signup()).status).toBe(403)
      expect((await request(app).post('/api/auth/otp/send').send({ phone: '9876543210' })).status).toBe(403)
      expect((await request(app).get('/api/meta/site')).body.loginMode).toBe('guest')
    } finally { env.LOGIN_MODE = 'account' }
    expect((await request(app).post('/api/auth/otp/send').send({ phone: '9876543210' })).status).toBe(403)
  })
})
