import { Router, type RequestHandler } from 'express'
import { env } from '../config/env.js'
import { z } from 'zod'
import { Address } from '../models/Address.js'
import { Customer } from '../models/Customer.js'
import { CUSTOMER_COOKIE, cookieOpts, limiter, optionalCustomer, requireCustomer, validate } from '../middleware/common.js'
import { addressBody, objectId, phoneField } from '../lib/schemas.js'
import { sendOtp, verifyOtp } from '../services/otp.js'
import { signCustomer } from '../services/tokens.js'
import { HttpError, notFound } from '../lib/errors.js'

export const authRouter = Router()

/** Phone-code sign in is switched off in guest mode (LOGIN_MODE=guest). The code stays so "otp" can be turned on later. */
const needOtpLogin: RequestHandler = (_req, _res, next) => {
  if (env.LOGIN_MODE !== 'otp') return next(new HttpError(403, 'Sign in with a phone code is switched off. You can order as a guest.', { code: 'login_disabled' }))
  next()
}

authRouter.post('/auth/otp/send', needOtpLogin, limiter(10 * 60_000, 10, 'Too many code requests. Please wait a few minutes.'),
  validate({ body: z.object({ phone: phoneField }).strict() }), async (req, res) => {
    res.json(await sendOtp(req.valid.body.phone))
  })

authRouter.post('/auth/otp/verify', needOtpLogin, limiter(10 * 60_000, 20, 'Too many tries. Please wait a few minutes.'),
  validate({ body: z.object({ phone: phoneField, code: z.string().regex(/^\d{6}$/, 'Enter the 6 digit code') }).strict() }), async (req, res) => {
    const c = await verifyOtp(req.valid.body.phone, req.valid.body.code)
    res.cookie(CUSTOMER_COOKIE, signCustomer(String(c._id)), cookieOpts(30 * 24 * 3600_000))
    res.json({ customer: { id: c._id, phone: c.phone, name: c.name, email: c.email } })
  })

authRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' })
  res.json({ ok: true })
})

const pub = (c: { _id: unknown; phone?: string | null; name: string; email: string }) => ({ id: String(c._id), phone: c.phone ?? '', name: c.name, email: c.email })

// asked by every page load: answers 200 with customer null when signed out, so no red error shows in the browser console
authRouter.get('/session', optionalCustomer, async (req, res) => {
  const c = req.customerId ? await Customer.findById(req.customerId).lean() : null
  res.json({ customer: c ? pub(c) : null })
})

authRouter.get('/me', requireCustomer, async (req, res) => {
  const c = await Customer.findById(req.customerId).lean()
  if (!c) throw notFound('Account not found')
  res.json({ customer: pub(c) })
})

authRouter.patch('/me', requireCustomer, validate({ body: z.object({ name: z.string().trim().max(80).optional(), email: z.union([z.literal(''), z.email().max(120)]).optional() }).strict() }), async (req, res) => {
  const c = await Customer.findByIdAndUpdate(req.customerId, { $set: req.valid.body }, { returnDocument: 'after' }).lean()
  res.json({ customer: c ? pub(c) : c })
})

authRouter.get('/me/addresses', requireCustomer, async (req, res) => {
  res.json({ addresses: await Address.find({ customerId: req.customerId }).sort({ isDefault: -1, createdAt: -1 }).lean() })
})

const withDefault = addressBody.extend({ isDefault: z.boolean().optional() })

async function applyDefault(customerId: string, addressId: unknown) {
  await Address.updateMany({ customerId, _id: { $ne: addressId } }, { $set: { isDefault: false } })
  await Customer.updateOne({ _id: customerId }, { $set: { defaultAddressId: addressId } })
}

authRouter.post('/me/addresses', requireCustomer, validate({ body: withDefault }), async (req, res) => {
  const count = await Address.countDocuments({ customerId: req.customerId })
  if (count >= 10) return res.status(409).json({ error: 'You can save up to 10 addresses.' })
  const a = await Address.create({ ...req.valid.body, customerId: req.customerId, isDefault: req.valid.body.isDefault || count === 0 })
  if (a.isDefault) await applyDefault(req.customerId!, a._id)
  res.status(201).json({ address: a })
})

authRouter.patch('/me/addresses/:id', requireCustomer, validate({ params: z.object({ id: objectId }), body: withDefault.partial() }), async (req, res) => {
  const a = await Address.findOneAndUpdate({ _id: req.valid.params.id, customerId: req.customerId }, { $set: req.valid.body }, { returnDocument: 'after' })
  if (!a) throw notFound('Address not found')
  if (req.valid.body.isDefault) await applyDefault(req.customerId!, a._id)
  res.json({ address: a })
})

authRouter.delete('/me/addresses/:id', requireCustomer, validate({ params: z.object({ id: objectId }) }), async (req, res) => {
  const a = await Address.findOneAndDelete({ _id: req.valid.params.id, customerId: req.customerId })
  if (!a) throw notFound('Address not found')
  if (a.isDefault) {
    const next = await Address.findOne({ customerId: req.customerId }).sort({ createdAt: -1 })
    if (next) { next.isDefault = true; await next.save(); await applyDefault(req.customerId!, next._id) }
    else await Customer.updateOne({ _id: req.customerId }, { $unset: { defaultAddressId: 1 } })
  }
  res.json({ ok: true })
})

// ---- saved cart: the browser cart is merged into the account on sign in ----
const cartLines = z.object({ items: z.array(z.object({
  productId: objectId, slug: z.string().max(120).default(''), cut: z.string().max(40).nullish(), weightG: z.number().int().min(1).max(100_000).nullish(), qty: z.number().int().min(1).max(50),
}).strict()).max(50) }).strict()

const sameLine = (a: any, b: any) => a.productId === b.productId && (a.cut ?? null) === (b.cut ?? null) && (a.weightG ?? null) === (b.weightG ?? null)

authRouter.get('/me/cart', requireCustomer, async (req, res) => {
  const c = await Customer.findById(req.customerId)
  if (!c) throw notFound('Account not found')
  res.json({ items: c.cart })
})

/** Adds the lines to the saved cart (same product, cut and weight: quantities add up, max 50) and returns the result. */
authRouter.post('/me/cart/merge', requireCustomer, validate({ body: cartLines }), async (req, res) => {
  const c = await Customer.findById(req.customerId)
  if (!c) throw notFound('Account not found')
  const merged: any[] = c.cart.map((l: any) => ({ ...l.toObject() }))
  for (const l of req.valid.body.items) {
    const hit = merged.find((m) => sameLine(m, l))
    if (hit) hit.qty = Math.min(50, hit.qty + l.qty)
    else merged.push({ ...l, cut: l.cut ?? null, weightG: l.weightG ?? null })
  }
  c.cart = merged.slice(0, 50) as any
  await c.save()
  res.json({ items: c.cart })
})

/** Replaces the saved cart (called whenever a signed in customer changes the cart). */
authRouter.put('/me/cart', requireCustomer, validate({ body: cartLines }), async (req, res) => {
  await Customer.updateOne({ _id: req.customerId }, { $set: { cart: req.valid.body.items } })
  res.json({ items: req.valid.body.items })
})
