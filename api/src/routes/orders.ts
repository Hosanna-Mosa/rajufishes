import { Router } from 'express'
import { z } from 'zod'
import { Order } from '../models/Order.js'
import { limiter, optionalCustomer, requireCustomer, validate } from '../middleware/common.js'
import { addressBody, cartItem, objectId, phoneField } from '../lib/schemas.js'
import { changeStatus, createOrder, markPaid, paymentForOrder } from '../services/orders.js'
import { signTrack, verifyTrack } from '../services/tokens.js'
import { razorpayIsMock, signPayment, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.js'
import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { HttpError, notFound } from '../lib/errors.js'

export const ordersRouter = Router()

/** What a customer may see. No admin notes. */
export const publicOrder = (o: any) => {
  const { adminNote: _a, __v, ...rest } = typeof o.toObject === 'function' ? o.toObject() : o
  return rest
}

const createBody = z.object({
  contact: z.object({ name: z.string().trim().min(1).max(80), phone: phoneField, email: z.union([z.literal(''), z.email().max(120)]).optional() }).strict(),
  address: addressBody,
  deliverySlot: z.string().max(40),
  items: z.array(cartItem).min(1).max(50),
  couponCode: z.string().trim().max(30).nullish(),
  paymentMethod: z.enum(['razorpay', 'cod']),
}).strict()

ordersRouter.post('/orders', limiter(60 * 60_000, 20, 'Too many orders. Please try again later.'), optionalCustomer, validate({ body: createBody }), async (req, res) => {
  const { order, razorpay } = await createOrder({ ...req.valid.body, customerId: req.customerId ?? null })
  res.status(201).json({ order: publicOrder(order), razorpay, trackToken: req.customerId ? null : signTrack(order.orderNo) })
})

ordersRouter.get('/orders', requireCustomer, async (req, res) => {
  const orders = await Order.find({ customerId: req.customerId }).sort({ createdAt: -1 }).limit(50)
  res.json({ orders: orders.map(publicOrder) })
})

async function findForViewer(orderNo: string, customerId?: string, token?: string) {
  const o = await Order.findOne({ orderNo })
  if (!o) throw notFound('Order not found')
  const mine = customerId && o.customerId && String(o.customerId) === customerId
  if (!mine && !(token && verifyTrack(token, orderNo))) throw notFound('Order not found') // same answer either way
  return o
}

ordersRouter.get('/orders/track', limiter(60_000, 30), validate({ query: z.object({ orderNo: z.string().max(12), token: z.string().max(1000) }) }), async (req, res) => {
  res.json({ order: publicOrder(await findForViewer(req.valid.query.orderNo, undefined, req.valid.query.token)) })
})

ordersRouter.get('/orders/:orderNo', optionalCustomer, validate({ query: z.object({ token: z.string().max(1000).optional() }) }), async (req, res) => {
  res.json({ order: publicOrder(await findForViewer(String(req.params.orderNo), req.customerId, req.valid.query.token)) })
})

ordersRouter.post('/orders/:orderNo/cancel', optionalCustomer, validate({ body: z.object({ token: z.string().max(1000).optional() }).strict() }), async (req, res) => {
  const o = await findForViewer(String(req.params.orderNo), req.customerId, req.valid.body.token)
  if (o.status !== 'placed') throw new HttpError(409, 'This order can no longer be cancelled here. Please call us.')
  const updated = await changeStatus(String(o._id), 'cancelled', 'customer', { note: 'Cancelled by customer' })
  res.json({ order: publicOrder(updated) })
})

/** A fresh payment window for an unpaid online order (the customer closed it, or it failed). */
ordersRouter.post('/orders/:orderNo/pay', optionalCustomer, validate({ body: z.object({ token: z.string().max(1000).optional() }).strict() }), async (req, res) => {
  const o = await findForViewer(String(req.params.orderNo), req.customerId, req.valid.body.token)
  res.json({ razorpay: await paymentForOrder(o.orderNo) })
})

// ---- payments ----
export const paymentsRouter = Router()

paymentsRouter.post('/payments/razorpay/verify', limiter(60_000, 30), validate({ body: z.object({
  razorpay_order_id: z.string().max(60), razorpay_payment_id: z.string().max(60), razorpay_signature: z.string().max(200),
}).strict() }), async (req, res) => {
  const b = req.valid.body
  if (!verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) throw new HttpError(400, 'Payment could not be verified.')
  const o = await markPaid(b.razorpay_order_id, b.razorpay_payment_id)
  res.json({ order: publicOrder(o) })
})

/**
 * Mock mode only (no Razorpay keys, never in production): stands in for the Razorpay window.
 * "Pay" returns a valid signature for the browser to send to /verify, like the real window would.
 */
paymentsRouter.post('/payments/mock/pay', limiter(60_000, 30), validate({ body: z.object({ razorpay_order_id: z.string().max(60) }).strict() }), async (req, res) => {
  if (!razorpayIsMock() || env.NODE_ENV === 'production') throw notFound()
  const orderId = req.valid.body.razorpay_order_id
  const o = await Order.findOne({ 'payment.razorpayOrderId': orderId })
  if (!o) throw notFound('Order not found')
  const paymentId = `pay_dev_${crypto.randomBytes(6).toString('hex')}`
  res.json({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signPayment(orderId, paymentId) })
})

/** Mounted with express.raw in app.ts: the signature is checked on the exact bytes Razorpay sent. */
export const razorpayWebhook = async (req: import('express').Request, res: import('express').Response) => {
  const sig = String(req.headers['x-razorpay-signature'] ?? '')
  if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, sig)) return res.status(400).json({ error: 'Bad signature' })
  const event = JSON.parse(req.body.toString('utf8'))
  const p = event?.payload?.payment?.entity
  if (event.event === 'payment.captured' && p?.order_id && p?.id) await markPaid(p.order_id, p.id)
  res.json({ ok: true })
}
