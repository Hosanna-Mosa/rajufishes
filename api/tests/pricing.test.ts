import { describe, expect, it } from 'vitest'
import { Coupon } from '../src/models/Coupon.js'
import { Settings } from '../src/models/DeliveryZone.js'
import { couponDiscount, priceLine, quote } from '../src/services/pricing.js'
import { deliveryCharge, matchZone } from '../src/services/delivery.js'
import { kgProduct, makeZone, packProduct, rs, useTestDb } from './helpers.js'

useTestDb()

describe('line pricing', () => {
  it('prices per kg by weight and adds the cut surcharge', async () => {
    const p = await kgProduct()
    const half = priceLine(p.toObject() as never, { productId: String(p._id), cut: 'Steaks', weightG: 500, qty: 2 })
    expect(half).toMatchObject({ unitPrice: rs(450), lineTotal: rs(900), stockUse: 1 })
    const fillet = priceLine(p.toObject() as never, { productId: String(p._id), cut: 'Fillet', weightG: 1000, qty: 1 })
    expect(fillet).toMatchObject({ unitPrice: rs(1000), stockUse: 1 })
  })
  it('prices a pack at its pack price', async () => {
    const p = await packProduct()
    expect(priceLine(p.toObject() as never, { productId: String(p._id), qty: 3 })).toMatchObject({ unitPrice: rs(500), lineTotal: rs(1500), stockUse: 3 })
  })
  it('rejects a weight or cut the product does not offer', async () => {
    const p = await kgProduct()
    expect(priceLine(p.toObject() as never, { productId: '', cut: 'Steaks', weightG: 750, qty: 1 })).toMatchObject({ code: 'bad_option' })
    expect(priceLine(p.toObject() as never, { productId: '', cut: 'Head', weightG: 500, qty: 1 })).toMatchObject({ code: 'bad_option' })
  })
})

describe('delivery charge', () => {
  const zone = { charge: rs(60), freeOver: rs(999) }
  it('is free at or over the limit and charged under it', () => {
    expect(deliveryCharge(zone, rs(998))).toBe(rs(60))
    expect(deliveryCharge(zone, rs(999))).toBe(0)
  })
  it('free-over uses the subtotal BEFORE any coupon', async () => {
    await makeZone()
    await Coupon.create({ code: 'FLAT100', type: 'flat', value: rs(100) })
    const p = await packProduct({ price: rs(1050) }) // subtotal 1050 -> 950 after coupon, still under 999
    const q = await quote({ items: [{ productId: String(p._id), qty: 1 }], couponCode: 'flat100', pincode: '500001' })
    expect(q.subtotal).toBe(rs(1050))
    expect(q.discount).toBe(rs(100))
    expect(q.deliveryCharge).toBe(0)
    expect(q.total).toBe(rs(950))
  })
  it('charges delivery when the subtotal is under the limit, even without a coupon', async () => {
    await makeZone()
    const p = await packProduct({ price: rs(998) })
    const q = await quote({ items: [{ productId: String(p._id), qty: 1 }], pincode: '500001' })
    expect(q.deliveryCharge).toBe(rs(60))
    expect(q.total).toBe(rs(1058))
    expect(q.amountToFreeDelivery).toBe(rs(1))
  })
})

describe('coupons', () => {
  const base = { code: 'X', type: 'percent', value: 10, maxDiscount: rs(100), minSubtotal: rs(499), active: true }
  it('caps a percent coupon and checks the minimum', () => {
    expect(couponDiscount(base, rs(2000))).toEqual({ discount: rs(100) })
    expect(couponDiscount(base, rs(600))).toEqual({ discount: rs(60) })
    expect(couponDiscount(base, rs(400))).toHaveProperty('error')
  })
  it('refuses expired, inactive and used-up coupons', () => {
    expect(couponDiscount({ ...base, endsAt: new Date(Date.now() - 1000) }, rs(600))).toHaveProperty('error')
    expect(couponDiscount({ ...base, active: false }, rs(600))).toHaveProperty('error')
    expect(couponDiscount({ ...base, usageLimit: 5, usedCount: 5 }, rs(600))).toHaveProperty('error')
    expect(couponDiscount(null, rs(600))).toHaveProperty('error')
  })
})

describe('zones and the fresh fish rule', () => {
  const zones = [
    { name: 'All India', isDefault: true, charge: 1, freeOver: 1 },
    { name: 'Telangana', match: { states: ['Telangana'] }, charge: 2, freeOver: 2 },
    { name: 'Hyd 500', match: { pincodePrefixes: ['500'] }, charge: 3, freeOver: 3 },
    { name: 'Hyd 5000', match: { pincodePrefixes: ['5000'] }, charge: 4, freeOver: 4 },
    { name: 'One pin', match: { pincodes: ['500081'] }, charge: 5, freeOver: 5 },
  ]
  it('picks exact pincode, then longest prefix, then state, then the default', () => {
    expect(matchZone(zones, '500081')!.name).toBe('One pin')
    expect(matchZone(zones, '500012')!.name).toBe('Hyd 5000')
    expect(matchZone(zones, '500700')!.name).toBe('Hyd 500')
    expect(matchZone(zones, '508001', 'Telangana')!.name).toBe('Telangana')
    expect(matchZone(zones, '110001')!.name).toBe('All India')
  })
  it('ignores inactive zones', () => {
    expect(matchZone([{ ...zones[4], active: false }, zones[0]], '500081')!.name).toBe('All India')
  })
  it('fresh fish is only blocked when the setting is on and the zone says no', async () => {
    await makeZone({ freshAllowed: false })
    const fish = await kgProduct()
    const items = [{ productId: String(fish._id), cut: 'Steaks', weightG: 1000, qty: 1 }]
    expect((await quote({ items, pincode: '500001' })).problems).toHaveLength(0) // off by default
    await Settings.updateOne({ key: 'main' }, { $set: { restrictFreshToZones: true } })
    expect((await quote({ items, pincode: '500001' })).problems[0]).toMatchObject({ code: 'fresh_not_delivered' })
    const dry = await packProduct()
    expect((await quote({ items: [{ productId: String(dry._id), qty: 1 }], pincode: '500001' })).problems).toHaveLength(0)
  })
})
