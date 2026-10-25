import { Order } from '../models/Order.js'
import { Coupon } from '../models/Coupon.js'
import { Settings, getSettings } from '../models/DeliveryZone.js'
import { HttpError } from '../lib/errors.js'
import { quote, type CartInput } from './pricing.js'
import { releaseStock, takeStock } from './stock.js'
import { createRazorpayOrder, razorpayKeyId, razorpayIsMock } from './razorpay.js'
import { notifyOrderPlaced, notifyStatusChanged, safely } from './notify.js'

export interface CreateOrderInput {
  customerId?: string | null
  contact: { name: string; phone: string; email?: string }
  address: { label?: string; name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string }
  deliverySlot: string
  items: CartInput[]
  couponCode?: string | null
  paymentMethod: 'razorpay' | 'cod'
}

async function nextOrderNo(): Promise<string> {
  await getSettings()
  const s = await Settings.findOneAndUpdate({ key: 'main' }, { $inc: { orderCounter: 1 } }, { returnDocument: 'after' })
  return String(s!.orderCounter + 420).padStart(4, '0') // starts at 0421 like the design
}

export async function createOrder(input: CreateOrderInput) {
  const settings = await getSettings()
  if (!settings.deliverySlots.some((s) => s.id === input.deliverySlot)) throw new HttpError(400, 'Choose a delivery time.')

  const q = await quote({
    items: input.items, couponCode: input.couponCode, pincode: input.address.pincode, state: input.address.state,
    customerId: input.customerId, guestPhone: input.customerId ? null : input.contact.phone, paymentMethod: input.paymentMethod,
  })
  if (q.problems.length) throw new HttpError(409, q.problems[0].message, q.problems)
  if (q.couponError) throw new HttpError(400, q.couponError)
  if (!q.zone || !q.lines.length) throw new HttpError(400, 'Your cart is empty.')

  // coupon use is claimed atomically so a usage limit cannot be beaten by two orders at once
  if (q.couponCode) {
    const c = await Coupon.updateOne(
      { code: q.couponCode, $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
      { $inc: { usedCount: 1 } },
    )
    if (c.modifiedCount !== 1) throw new HttpError(400, 'This coupon has been fully used.')
  }

  const online = input.paymentMethod === 'razorpay'
  const now = new Date()
  try {
    await takeStock(q.lines)
  } catch (e) {
    if (q.couponCode) await Coupon.updateOne({ code: q.couponCode }, { $inc: { usedCount: -1 } })
    throw e
  }

  const orderNo = await nextOrderNo()
  const order = await Order.create({
    orderNo,
    customerId: input.customerId ?? null,
    guestPhone: input.customerId ? null : input.contact.phone,
    contact: { name: input.contact.name, phone: input.contact.phone, email: input.contact.email ?? '' },
    shippingAddress: input.address,
    zoneId: q.zone.id,
    zoneName: q.zone.name,
    deliverySlot: input.deliverySlot,
    items: q.lines,
    subtotal: q.subtotal,
    deliveryCharge: q.deliveryCharge,
    discount: q.discount,
    total: q.total,
    couponCode: q.couponCode,
    status: 'placed',
    statusHistory: [{ status: 'placed', at: now, by: 'customer', note: '' }],
    payment: { method: input.paymentMethod, status: online ? 'pending' : 'cod_due' },
    stockState: online ? 'held' : 'committed',
    holdExpiresAt: online ? new Date(now.getTime() + settings.holdMinutes * 60_000) : null,
  })

  let razorpay: { orderId: string; keyId: string; amount: number; mock: boolean } | null = null
  if (online) {
    try {
      const r = await createRazorpayOrder(q.total, orderNo)
      await Order.updateOne({ _id: order._id }, { $set: { 'payment.razorpayOrderId': r.id } })
      razorpay = { orderId: r.id, keyId: r.keyId, amount: r.amount, mock: r.mock }
    } catch (e) {
      await releaseStock(String(order._id))
      await Order.deleteOne({ _id: order._id })
      throw e
    }
  }
  const created = (await Order.findById(order._id))!
  if (!online) void safely(notifyOrderPlaced(created)) // online orders are announced once paid
  return { order: created, razorpay }
}

/** What the browser needs to open (or reopen) the payment window for an unpaid online order. */
export async function paymentForOrder(orderNo: string) {
  const o = await Order.findOne({ orderNo })
  if (!o) throw new HttpError(404, 'Order not found')
  if (o.payment!.method !== 'razorpay' || o.payment!.status !== 'pending' || o.status !== 'placed') {
    throw new HttpError(409, 'This order does not need a payment.')
  }
  if (o.holdExpiresAt && o.holdExpiresAt.getTime() < Date.now()) throw new HttpError(409, 'The payment time ran out. Please place the order again.')
  let rid = o.payment!.razorpayOrderId
  if (!rid) {
    rid = (await createRazorpayOrder(o.total!, o.orderNo)).id
    await Order.updateOne({ _id: o._id }, { $set: { 'payment.razorpayOrderId': rid } })
  }
  return { orderId: rid, keyId: razorpayKeyId(), amount: o.total!, mock: razorpayIsMock() }
}

/** Marks an online order paid and keeps its stock. Repeat-safe (verify and webhook can both call it). */
export async function markPaid(razorpayOrderId: string, paymentId: string) {
  const paid = await Order.findOneAndUpdate(
    { 'payment.razorpayOrderId': razorpayOrderId, 'payment.status': 'pending', status: 'placed' },
    { $set: { 'payment.status': 'paid', 'payment.razorpayPaymentId': paymentId, 'payment.paidAt': new Date(), stockState: 'committed', holdExpiresAt: null } },
    { returnDocument: 'after' },
  )
  if (paid) {
    void safely(notifyOrderPlaced(paid))
    return paid
  }
  const existing = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId })
  if (!existing) throw new HttpError(404, 'Order not found')
  // paid after the hold expired and the order was cancelled: record it so the family can refund
  if (existing.status === 'cancelled' && existing.payment!.status !== 'paid' && existing.payment!.status !== 'refunded') {
    existing.payment!.status = 'paid'
    existing.payment!.razorpayPaymentId = paymentId
    existing.payment!.paidAt = new Date()
    existing.adminNote = `${existing.adminNote} Paid after the order was cancelled. Refund this payment.`.trim()
    await existing.save()
  }
  return existing
}

const NEXT: Record<string, string> = { placed: 'packed', packed: 'shipped', shipped: 'delivered' }

export async function changeStatus(orderId: string, to: string, by: string, opts: { note?: string; owner?: boolean } = {}) {
  const order = await Order.findById(orderId)
  if (!order) throw new HttpError(404, 'Order not found')
  const from = order.status
  if (to === 'cancelled') {
    if (from === 'cancelled' || from === 'delivered') throw new HttpError(409, `A ${from} order cannot be cancelled.`)
    if (from === 'shipped' && !opts.owner) throw new HttpError(403, 'Only the owner can cancel a shipped order.')
  } else {
    if (NEXT[from] !== to) throw new HttpError(409, `An order cannot go from ${from} to ${to}.`)
    if (order.payment!.method === 'razorpay' && order.payment!.status !== 'paid' && from === 'placed') {
      throw new HttpError(409, 'This online order has not been paid yet.')
    }
  }
  order.status = to as typeof order.status
  order.statusHistory.push({ status: to, at: new Date(), by, note: opts.note ?? '' } as never)
  if (to === 'cancelled') {
    order.cancelReason = opts.note ?? ''
    if (order.payment!.status === 'pending' || order.payment!.status === 'cod_due') order.payment!.status = 'failed'
  }
  await order.save()
  if (to === 'cancelled') await releaseStock(String(order._id))
  const updated = (await Order.findById(orderId))!
  await safely(notifyStatusChanged(updated, from, to))
  return updated
}
