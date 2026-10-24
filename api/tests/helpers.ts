import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { connectDb, disconnectDb } from '../src/config/db.js'
import { Product } from '../src/models/Product.js'
import { DeliveryZone, getSettings } from '../src/models/DeliveryZone.js'

/** One in-memory MongoDB per test file, emptied before every test. */
export function useTestDb() {
  beforeAll(async () => {
    if (process.env.MONGODB_URI) throw new Error('Tests must not run against a real database')
    await connectDb()
  })
  afterAll(disconnectDb)
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})))
  })
}

export const rs = (n: number) => n * 100

export async function makeZone(over: Record<string, unknown> = {}) {
  await getSettings()
  return DeliveryZone.create({ name: 'All India', isDefault: true, charge: rs(60), freeOver: rs(999), ...over })
}

export const packProduct = (over: Record<string, unknown> = {}) =>
  Product.create({
    name: 'Dry anchovies', slug: `dry-${Math.random().toString(36).slice(2, 8)}`, category: 'dry', group: 'Dry fish',
    unit: 'pack', packWeightG: 250, price: rs(500), stock: 10, ...over,
  })

export const kgProduct = (over: Record<string, unknown> = {}) =>
  Product.create({
    name: 'Seer fish', slug: `seer-${Math.random().toString(36).slice(2, 8)}`, category: 'fresh', group: 'Fresh fish',
    unit: 'kg', price: rs(900), weights: [500, 1000, 2000], cuts: [{ name: 'Steaks', priceDeltaPerKg: 0 }, { name: 'Fillet', priceDeltaPerKg: rs(100) }], stock: 5, ...over,
  })

export const address = (over: Record<string, unknown> = {}) => ({
  name: 'Test Buyer', phone: '9876543210', line1: '12-3-45 Sample Street', city: 'Hyderabad', state: 'Telangana', pincode: '500001', ...over,
})
export const contact = { name: 'Test Buyer', phone: '9876543210' }
