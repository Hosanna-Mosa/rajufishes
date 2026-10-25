import bcrypt from 'bcryptjs'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { AdminUser } from '../src/models/AdminUser.js'
import { useTestDb } from './helpers.js'

useTestDb()
const app = createApp()

describe('launch basics', () => {
  it('health is ok with a database', async () => {
    const r = await request(app).get('/health')
    expect(r.status).toBe(200)
    expect(r.body.status).toBe('ok')
  })

  it('session is 200 with no customer when signed out', async () => {
    const r = await request(app).get('/api/session')
    expect(r.status).toBe(200)
    expect(r.body.customer).toBeNull()
  })

  it('shop details saved by the owner appear on the public contact route', async () => {
    await AdminUser.create({ email: 'o@t.test', name: 'O', role: 'owner', passwordHash: await bcrypt.hash('a-long-test-password', 4) })
    const login = await request(app).post('/api/admin/auth/login').send({ email: 'o@t.test', password: 'a-long-test-password' })
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0]
    const save = await request(app).patch('/api/admin/settings').set('Cookie', cookie)
      .send({ businessName: 'Test Fishes', stallEmail: 'hello@t.test', stallAddress: 'Fish Market, Vizag', openingHours: '5 am to 11 am' })
    expect(save.status).toBe(200)
    const r = await request(app).get('/api/meta/contact')
    expect(r.body.contact).toMatchObject({ businessName: 'Test Fishes', email: 'hello@t.test', address: 'Fish Market, Vizag', hours: '5 am to 11 am' })
    const bad = await request(app).patch('/api/admin/settings').set('Cookie', cookie).send({ stallEmail: 'not-an-email' })
    expect(bad.status).toBe(400)
  })

  it('admin product list is paged', async () => {
    await AdminUser.create({ email: 'o2@t.test', name: 'O', role: 'owner', passwordHash: await bcrypt.hash('a-long-test-password', 4) })
    const login = await request(app).post('/api/admin/auth/login').send({ email: 'o2@t.test', password: 'a-long-test-password' })
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0]
    const r = await request(app).get('/api/admin/products?limit=5&page=1').set('Cookie', cookie)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ items: [], total: 0, page: 1 })
  })
})

describe('admin order alerts', () => {
  it('lists confirmed new orders only (cash, or paid), not unpaid online ones', async () => {
    const { Order } = await import('../src/models/Order.js')
    await AdminUser.create({ email: 'o3@t.test', name: 'O', role: 'owner', passwordHash: await bcrypt.hash('a-long-test-password', 4) })
    const login = await request(app).post('/api/admin/auth/login').send({ email: 'o3@t.test', password: 'a-long-test-password' })
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0]
    const base = { shippingAddress: { name: 'A', phone: '9876543210', line1: 'x', city: 'c', state: 's', pincode: '500001' }, contact: { name: 'A', phone: '9876543210' }, items: [], total: 1000, status: 'placed' as const }
    await Order.create({ ...base, orderNo: '0501', payment: { method: 'cod', status: 'cod_due' } })
    await Order.create({ ...base, orderNo: '0502', payment: { method: 'razorpay', status: 'paid' } })
    await Order.create({ ...base, orderNo: '0503', payment: { method: 'razorpay', status: 'pending' } })
    const r = await request(app).get('/api/admin/orders/alerts').set('Cookie', cookie)
    expect(r.status).toBe(200)
    expect(r.body.items.map((i: any) => i.orderNo).sort()).toEqual(['0501', '0502'])
    expect((await request(app).get('/api/admin/orders/alerts')).status).toBe(401)
  })
})
