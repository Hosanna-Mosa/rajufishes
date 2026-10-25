import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { kgProduct, packProduct, useTestDb } from './helpers.js'

useTestDb()
const app = createApp()

describe('product search (?q=)', () => {
  it('matches name and category, ignoring case, and skips inactive products', async () => {
    await kgProduct({ name: 'Black Pomfret' })
    await packProduct({ name: 'Dry anchovies' })
    await packProduct({ name: 'Pomfret chips', active: false })
    const byName = await request(app).get('/api/products').query({ q: 'POMFR' })
    expect(byName.body.items.map((p: any) => p.name)).toEqual(['Black Pomfret'])
    const byCategory = await request(app).get('/api/products').query({ q: 'Dry' })
    expect(byCategory.body.items.map((p: any) => p.name)).toEqual(['Dry anchovies'])
    expect(byCategory.body.total).toBe(1)
  })

  it('treats typed symbols as plain text and ignores a single character', async () => {
    await kgProduct({ name: 'Black Pomfret' })
    const rx = await request(app).get('/api/products').query({ q: '.*' })
    expect(rx.status).toBe(200)
    expect(rx.body.items).toHaveLength(0)
    const one = await request(app).get('/api/products').query({ q: 'p' })
    expect(one.body.items).toHaveLength(1) // under 2 letters: no filter
  })
})
