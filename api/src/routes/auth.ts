import { Router } from 'express'
import { z } from 'zod'
import { Address } from '../models/Address.js'
import { Customer } from '../models/Customer.js'
import { CUSTOMER_COOKIE, cookieOpts, limiter, requireCustomer, validate } from '../middleware/common.js'
import { addressBody, objectId, phoneField } from '../lib/schemas.js'
import { sendOtp, verifyOtp } from '../services/otp.js'
import { signCustomer } from '../services/tokens.js'
import { notFound } from '../lib/errors.js'

export const authRouter = Router()

authRouter.post('/auth/otp/send', limiter(10 * 60_000, 10, 'Too many code requests. Please wait a few minutes.'),
  validate({ body: z.object({ phone: phoneField }).strict() }), async (req, res) => {
    res.json(await sendOtp(req.valid.body.phone))
  })

authRouter.post('/auth/otp/verify', limiter(10 * 60_000, 20, 'Too many tries. Please wait a few minutes.'),
  validate({ body: z.object({ phone: phoneField, code: z.string().regex(/^\d{6}$/, 'Enter the 6 digit code') }).strict() }), async (req, res) => {
    const c = await verifyOtp(req.valid.body.phone, req.valid.body.code)
    res.cookie(CUSTOMER_COOKIE, signCustomer(String(c._id)), cookieOpts(30 * 24 * 3600_000))
    res.json({ customer: { id: c._id, phone: c.phone, name: c.name, email: c.email } })
  })

authRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' })
  res.json({ ok: true })
})

authRouter.get('/me', requireCustomer, async (req, res) => {
  const c = await Customer.findById(req.customerId).lean()
  if (!c) throw notFound('Account not found')
  res.json({ customer: c })
})

authRouter.patch('/me', requireCustomer, validate({ body: z.object({ name: z.string().trim().max(80).optional(), email: z.union([z.literal(''), z.email().max(120)]).optional() }).strict() }), async (req, res) => {
  const c = await Customer.findByIdAndUpdate(req.customerId, { $set: req.valid.body }, { returnDocument: 'after' }).lean()
  res.json({ customer: c })
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
