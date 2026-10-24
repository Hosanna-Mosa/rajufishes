import { describe, expect, it } from 'vitest'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { Coupon } from '../src/models/Coupon.js'
import { changeStatus, createOrder, markPaid } from '../src/services/orders.js'
import { expireHolds, releaseStock } from '../src/services/stock.js'
import { address, contact, kgProduct, makeZone, packProduct, rs, useTestDb } from './helpers.js'

useTestDb()

const place = (productId: string, qty: number, paymentMethod: 'cod' | 'razorpay', extra: object = {}) =>
  createOrder({ contact, address: address(), deliverySlot: 'tomorrow_morning', items: [{ productId, qty }], paymentMethod, ...extra })
const stockOf = async (id: unknown) => (await Product.findById(id))!.stock

describe('stock hold and release', () => {
  it('COD takes the stock for good right away', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const { order } = await place(String(p._id), 3, 'cod')
    expect(await stockOf(p._id)).toBe(7)
    expect(order.stockState).toBe('committed')
    expect(order.payment!.status).toBe('cod_due')
  })

  it('online payment holds the stock for 30 minutes', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const { order, razorpay } = await place(String(p._id), 2, 'razorpay')
    expect(await stockOf(p._id)).toBe(8)
    expect(order.stockState).toBe('held')
    expect(razorpay?.orderId).toMatch(/^order_/)
    const minutes = (order.holdExpiresAt!.getTime() - Date.now()) / 60000
    expect(minutes).toBeGreaterThan(29)
    expect(minutes).toBeLessThanOrEqual(30)
  })

  it('puts the stock back when an unpaid hold expires, and cancels the order', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const { order } = await place(String(p._id), 4, 'razorpay')
    expect(await expireHolds(new Date(Date.now() + 10 * 60_000))).toBe(0) // too early
    expect(await stockOf(p._id)).toBe(6)
    expect(await expireHolds(new Date(Date.now() + 31 * 60_000))).toBe(1)
    expect(await stockOf(p._id)).toBe(10)
    const o = (await Order.findById(order._id))!
    expect(o.status).toBe('cancelled')
    expect(o.payment!.status).toBe('failed')
    expect(o.stockState).toBe('released')
    expect(await expireHolds(new Date(Date.now() + 60 * 60_000))).toBe(0) // nothing twice
    expect(await stockOf(p._id)).toBe(10)
  })

  it('a paid order keeps its stock and is not expired', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const { order, razorpay } = await place(String(p._id), 2, 'razorpay')
    const paid = await markPaid(razorpay!.orderId, 'pay_123')
    expect(paid.payment!.status).toBe('paid')
    expect(paid.stockState).toBe('committed')
    expect(await expireHolds(new Date(Date.now() + 60 * 60_000))).toBe(0)
    expect(await stockOf(p._id)).toBe(8)
    await markPaid(razorpay!.orderId, 'pay_123') // verify and webhook may both arrive
    expect(await stockOf(p._id)).toBe(8)
    expect((await Order.findById(order._id))!.payment!.razorpayPaymentId).toBe('pay_123')
  })

  it('cancelling releases stock once, and a second release does nothing', async () => {
    await makeZone()
    const p = await packProduct({ stock: 10 })
    const { order } = await place(String(p._id), 5, 'cod')
    await changeStatus(String(order._id), 'cancelled', 'test')
    expect(await stockOf(p._id)).toBe(10)
    expect(await releaseStock(String(order._id))).toBe(false)
    expect(await stockOf(p._id)).toBe(10)
  })

  it('counts kilograms for per-kg items', async () => {
    await makeZone()
    const p = await kgProduct({ stock: 5 })
    const { order } = await createOrder({ contact, address: address(), deliverySlot: 'tomorrow_morning', paymentMethod: 'cod',
      items: [{ productId: String(p._id), cut: 'Steaks', weightG: 500, qty: 3 }] })
    expect(await stockOf(p._id)).toBe(3.5)
    await changeStatus(String(order._id), 'cancelled', 'test')
    expect(await stockOf(p._id)).toBe(5)
  })

  it('does not oversell, and leaves stock alone when an order is refused', async () => {
    await makeZone()
    const p = await packProduct({ stock: 2 })
    await expect(place(String(p._id), 3, 'cod')).rejects.toMatchObject({ status: 409 })
    expect(await stockOf(p._id)).toBe(2)
    expect(await Order.countDocuments()).toBe(0)
  })

  it('only one of two parallel orders gets the last unit', async () => {
    await makeZone()
    const p = await packProduct({ stock: 1 })
    const results = await Promise.allSettled([place(String(p._id), 1, 'cod'), place(String(p._id), 1, 'cod')])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await stockOf(p._id)).toBe(0)
  })

  it('does not take stock for products that are not tracked', async () => {
    await makeZone()
    const p = await packProduct({ stock: 0, trackStock: false })
    await place(String(p._id), 2, 'cod')
    expect(await stockOf(p._id)).toBe(0)
  })

  it('gives the coupon use back when the order is cancelled', async () => {
    await makeZone()
    await Coupon.create({ code: 'TEN', type: 'percent', value: 10, usageLimit: 1 })
    const p = await packProduct({ price: rs(600) })
    const { order } = await place(String(p._id), 1, 'cod', { couponCode: 'ten' })
    expect(order.discount).toBe(rs(60))
    expect((await Coupon.findOne({ code: 'TEN' }))!.usedCount).toBe(1)
    await expect(place(String(p._id), 1, 'cod', { couponCode: 'ten' })).rejects.toBeTruthy() // used up
    await changeStatus(String(order._id), 'cancelled', 'test')
    expect((await Coupon.findOne({ code: 'TEN' }))!.usedCount).toBe(0)
  })

  it('moves forward one step at a time and will not pack an unpaid online order', async () => {
    await makeZone()
    const p = await packProduct()
    const { order, razorpay } = await place(String(p._id), 1, 'razorpay')
    await expect(changeStatus(String(order._id), 'packed', 'test')).rejects.toMatchObject({ status: 409 })
    await markPaid(razorpay!.orderId, 'pay_1')
    await expect(changeStatus(String(order._id), 'shipped', 'test')).rejects.toMatchObject({ status: 409 })
    for (const s of ['packed', 'shipped', 'delivered']) expect((await changeStatus(String(order._id), s, 'test')).status).toBe(s)
    await expect(changeStatus(String(order._id), 'cancelled', 'test')).rejects.toMatchObject({ status: 409 })
  })
})
