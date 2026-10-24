import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { OtpCode } from '../src/models/Customer.js'
import { createApp } from '../src/app.js'
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, sendOtp, verifyOtp } from '../src/services/otp.js'
import { normalizePhone } from '../src/lib/phone.js'
import { useTestDb } from './helpers.js'

useTestDb()
const app = createApp()
const phone = '9876543210'

describe('phone numbers', () => {
  it('accepts common Indian formats and rejects the rest', () => {
    expect(normalizePhone('+91 98765 43210')).toBe(phone)
    expect(normalizePhone('09876543210')).toBe(phone)
    expect(normalizePhone('5876543210')).toBeNull()
    expect(normalizePhone('98765')).toBeNull()
  })
})

describe('OTP sign in', () => {
  it('sends, verifies with the fixed test code, sets a cookie and opens /me', async () => {
    const sent = await request(app).post('/api/auth/otp/send').send({ phone })
    expect(sent.status).toBe(200)
    expect(JSON.stringify(sent.body)).not.toContain('123456') // the code is never returned
    const ok = await request(app).post('/api/auth/otp/verify').send({ phone: '+91 9876543210', code: '123456' })
    expect(ok.status).toBe(200)
    const cookie = ok.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toContain('rf_customer=')
    expect(cookie).toContain('HttpOnly')
    const me = await request(app).get('/api/me').set('Cookie', cookie)
    expect(me.body.customer.phone).toBe(phone)
    expect((await request(app).get('/api/me')).status).toBe(401)
  })

  it('refuses a wrong code and a code that is used twice', async () => {
    await sendOtp(phone)
    expect((await request(app).post('/api/auth/otp/verify').send({ phone, code: '000000' })).status).toBe(400)
    expect((await request(app).post('/api/auth/otp/verify').send({ phone, code: '123456' })).status).toBe(200)
    expect((await request(app).post('/api/auth/otp/verify').send({ phone, code: '123456' })).status).toBe(400)
  })

  it('locks a code after five wrong tries, even if the right code follows', async () => {
    await sendOtp(phone)
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) await expect(verifyOtp(phone, '111111')).rejects.toMatchObject({ status: 400 })
    await expect(verifyOtp(phone, '123456')).rejects.toMatchObject({ status: 429 })
  })

  it('refuses an expired code', async () => {
    await sendOtp(phone)
    await expect(verifyOtp(phone, '123456', new Date(Date.now() + OTP_TTL_MS + 1000))).rejects.toMatchObject({ status: 400 })
  })

  it('limits how many codes one number can ask for', async () => {
    for (let i = 0; i < 3; i++) await sendOtp(phone)
    await expect(sendOtp(phone)).rejects.toMatchObject({ status: 429 })
    await expect(sendOtp('9123456780')).resolves.toBeTruthy() // another number is fine
  })

  it('never stores the code itself', async () => {
    await sendOtp(phone)
    const rec = (await OtpCode.findOne({ phone }).lean())!
    expect(JSON.stringify(rec)).not.toContain('123456')
    expect(rec.codeHash).toHaveLength(64)
  })

  it('rejects bad input', async () => {
    expect((await request(app).post('/api/auth/otp/send').send({ phone: '123' })).status).toBe(400)
    expect((await request(app).post('/api/auth/otp/verify').send({ phone, code: 'abcdef' })).status).toBe(400)
    expect((await request(app).post('/api/auth/otp/send').send({ phone, extra: 1 })).status).toBe(400)
  })

  it('logs out by clearing the cookie', async () => {
    const r = await request(app).post('/api/auth/logout')
    expect(r.headers['set-cookie']?.[0]).toContain('rf_customer=;')
  })
})
