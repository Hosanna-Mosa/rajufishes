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
