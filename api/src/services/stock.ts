import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Coupon } from '../models/Coupon.js'
import { HttpError } from '../lib/errors.js'
import type { PricedLine } from './pricing.js'

function perProduct(items: Pick<PricedLine, 'productId' | 'stockUse'>[]) {
  const m = new Map<string, number>()
  for (const i of items) if (i.stockUse > 0) m.set(i.productId, (m.get(i.productId) ?? 0) + i.stockUse)
  return m
}

/** Takes stock for an order. Each product is an atomic conditional update; on a shortfall everything taken is put back. */
export async function takeStock(items: Pick<PricedLine, 'productId' | 'stockUse'>[]) {
  const taken: [string, number][] = []
  for (const [id, n] of perProduct(items)) {
    const r = await Product.updateOne({ _id: id, trackStock: true, stock: { $gte: n } }, { $inc: { stock: -n } })
    if (r.modifiedCount !== 1) {
      for (const [pid, pn] of taken) await Product.updateOne({ _id: pid }, { $inc: { stock: pn } })
      throw new HttpError(409, 'Some items just sold out. Please check your cart.')
    }
    taken.push([id, n])
  }
}

/**
 * Puts the stock (and the coupon use) of an order back, exactly once.
 * Safe to call again: the stockState flip makes the second call do nothing.
 */
export async function releaseStock(orderId: string): Promise<boolean> {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockState: { $ne: 'released' } },
    { $set: { stockState: 'released', holdExpiresAt: null } },
    { returnDocument: 'before' },
  )
  if (!order) return false
  for (const [id, n] of perProduct(order.items.map((i) => ({ productId: String(i.productId), stockUse: i.stockUse ?? 0 })))) {
    await Product.updateOne({ _id: id }, { $inc: { stock: n } })
  }
  if (order.couponCode) await Coupon.updateOne({ code: order.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } })
  return true
}

/** Cancels unpaid online orders whose 30 minute hold ran out and gives the stock back. Returns how many. */
export async function expireHolds(now = new Date()): Promise<number> {
  const due = await Order.find({
    stockState: 'held', holdExpiresAt: { $lte: now }, 'payment.status': 'pending', status: 'placed',
  }).select('_id')
  let n = 0
  for (const o of due) {
    const r = await Order.updateOne(
      { _id: o._id, 'payment.status': 'pending', status: 'placed' },
      {
        $set: { status: 'cancelled', 'payment.status': 'failed', cancelReason: 'Payment not completed in time' },
        $push: { statusHistory: { status: 'cancelled', at: now, by: 'system', note: 'Payment hold expired' } },
      },
    )
    if (r.modifiedCount === 1) {
      await releaseStock(String(o._id))
      n++
    }
  }
  return n
}
