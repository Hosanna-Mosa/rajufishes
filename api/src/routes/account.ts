import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router, type Request, type RequestHandler } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env.js'
import { Customer, PasswordReset } from '../models/Customer.js'
import { Order } from '../models/Order.js'
import { CUSTOMER_COOKIE, cookieOpts, requireCustomer, validate } from '../middleware/common.js'
import { phoneField } from '../lib/schemas.js'
import { HttpError, notFound } from '../lib/errors.js'
import { signCustomer } from '../services/tokens.js'
import { mailer } from '../services/mail.js'

/** Email + password accounts (LOGIN_MODE=account). The phone code routes in auth.ts stay, switched off. */
export const accountRouter = Router()

export const BCRYPT_COST = 12
export const RESET_TTL_MS = 30 * 60_000
export const SESSION_MS = 7 * 24 * 3600_000
const WRONG = 'Email or password is wrong'

const needAccounts: RequestHandler = (_req, _res, next) => {
  if (env.LOGIN_MODE !== 'account') return next(new HttpError(403, 'Accounts are switched off. You can order as a guest.', { code: 'login_disabled' }))
  next()
}

/** 5 tries per 15 minutes for one address (IP) and one email. Off in tests unless RATE_LIMIT_TEST=1. */
const tries = () => rateLimit({
  windowMs: 15 * 60_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test' && process.env.RATE_LIMIT_TEST !== '1',
  keyGenerator: (req: Request) => `${ipKeyGenerator(req.ip ?? '')}|${String((req.body as { email?: unknown } | undefined)?.email ?? '').trim().toLowerCase().slice(0, 120)}`,
  message: { error: 'Too many tries. Please wait 15 minutes and try again.' },
})

const email = z.email().max(120).transform((v) => v.trim().toLowerCase())
/** At least 8 characters; very long ones are refused because bcrypt only reads the first 72 bytes. */
export const password = z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters')
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Use letters and at least one number')

const pub = (c: { _id: unknown; phone?: string | null; name: string; email: string }) => ({ id: String(c._id), phone: c.phone ?? '', name: c.name, email: c.email })
const sign = (res: import('express').Response, id: unknown) => res.cookie(CUSTOMER_COOKIE, signCustomer(String(id)), cookieOpts(SESSION_MS))
const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex')
// a hash to compare against when the email is unknown, so "no such email" takes as long as "wrong password"
const DUMMY = bcrypt.hashSync('not-a-real-password', BCRYPT_COST)

accountRouter.post('/auth/signup', needAccounts, tries(), validate({ body: z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80), email, password, confirm: z.string().max(72),
}).strict() }), async (req, res) => {
  const b = req.valid.body
  if (b.password !== b.confirm) throw new HttpError(400, 'The two passwords do not match.')
  if (await Customer.exists({ email: b.email })) throw new HttpError(409, 'An account with this email already exists. Try signing in.')
  const passwordHash = await bcrypt.hash(b.password, BCRYPT_COST)
  const c = await Customer.create({ name: b.name, email: b.email, passwordHash, lastLoginAt: new Date() })
  sign(res, c._id)
  res.status(201).json({ customer: pub(c) })
})

accountRouter.post('/auth/login', needAccounts, tries(), validate({ body: z.object({ email, password: z.string().min(1).max(72) }).strict() }), async (req, res) => {
  const c = await Customer.findOne({ email: req.valid.body.email }).select('+passwordHash')
  const ok = await bcrypt.compare(req.valid.body.password, c?.passwordHash ?? DUMMY)
  if (!c || !c.passwordHash || !ok) throw new HttpError(401, WRONG)
  c.lastLoginAt = new Date()
  await c.save()
  sign(res, c._id)
  res.json({ customer: pub(c) })
})

/** Always answers the same, whether or not the email has an account. */
accountRouter.post('/auth/forgot', needAccounts, tries(), validate({ body: z.object({ email }).strict() }), async (req, res) => {
  const c = await Customer.findOne({ email: req.valid.body.email }).select('_id email name')
  if (c) {
    const token = crypto.randomBytes(32).toString('base64url')
    await PasswordReset.create({ customerId: c._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) })
    const base = (process.env.WEB_URL || env.CORS_ORIGIN.split(',')[0]).trim().replace(/\/$/, '')
    void mailer.send({
      to: c.email, subject: 'Reset your Raju Fishes password',
      text: `Hello ${c.name || ''},\n\nUse this link to choose a new password. It works once and expires in 30 minutes:\n${base}/reset-password?token=${token}\n\nIf you did not ask for this, you can ignore this email. Your password has not changed.`,
    }).catch((e) => console.error('reset mail failed', e instanceof Error ? e.message : e))
  }
  res.json({ ok: true, message: 'If that email has an account, a reset link is on its way. It is valid for 30 minutes.' })
})

accountRouter.post('/auth/reset', needAccounts, tries(), validate({ body: z.object({ token: z.string().min(20).max(100), password, confirm: z.string().max(72) }).strict() }), async (req, res) => {
  const b = req.valid.body
  if (b.password !== b.confirm) throw new HttpError(400, 'The two passwords do not match.')
  const now = new Date()
  // claim the token first: only one request can flip usedAt, so a link cannot be used twice
  const rec = await PasswordReset.findOneAndUpdate({ tokenHash: hashToken(b.token), usedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } }, { returnDocument: 'after' })
  if (!rec) throw new HttpError(400, 'This reset link has expired or was already used. Please ask for a new one.')
  await Customer.updateOne({ _id: rec.customerId }, { $set: { passwordHash: await bcrypt.hash(b.password, BCRYPT_COST) } })
  await PasswordReset.updateMany({ customerId: rec.customerId, usedAt: null }, { $set: { usedAt: now } }) // older links stop working too
  res.json({ ok: true })
})

accountRouter.post('/me/password', needAccounts, requireCustomer, tries(), validate({ body: z.object({ current: z.string().min(1).max(72), password, confirm: z.string().max(72) }).strict() }), async (req, res) => {
  const b = req.valid.body
  if (b.password !== b.confirm) throw new HttpError(400, 'The two passwords do not match.')
  const c = await Customer.findById(req.customerId).select('+passwordHash')
  if (!c) throw notFound('Account not found')
  if (!c.passwordHash || !(await bcrypt.compare(b.current, c.passwordHash))) throw new HttpError(400, 'Your current password is wrong.')
  c.passwordHash = await bcrypt.hash(b.password, BCRYPT_COST)
  await c.save()
  res.json({ ok: true })
})

accountRouter.patch('/me/profile', needAccounts, requireCustomer, validate({ body: z.object({ name: z.string().trim().min(1).max(80).optional(), phone: z.union([z.literal(''), phoneField]).optional() }).strict() }), async (req, res) => {
  const set: Record<string, unknown> = { ...req.valid.body }
  const update = set.phone === '' ? { $set: { name: set.name }, $unset: { phone: 1 } } : { $set: set }
  if (set.phone === '') delete (update.$set as Record<string, unknown>).phone
  const c = await Customer.findByIdAndUpdate(req.customerId, update, { returnDocument: 'after' }).lean()
  if (!c) throw notFound('Account not found')
  res.json({ customer: pub(c) })
})

/** Links an earlier guest order to this account, once the buyer proves it with the order number and the phone on it. */
accountRouter.post('/me/orders/claim', needAccounts, requireCustomer, tries(), validate({ body: z.object({ orderNo: z.string().trim().max(12), phone: phoneField }).strict() }), async (req, res) => {
  const orderNo = req.valid.body.orderNo.replace(/^#/, '')
  const c = await Customer.findById(req.customerId).lean()
  if (!c) throw notFound('Account not found')
  const o = await Order.findOne({ orderNo, customerId: null, $or: [{ guestPhone: req.valid.body.phone }, { 'contact.phone': req.valid.body.phone }] })
  const mailOn = o?.contact?.email?.trim().toLowerCase()
  if (!o || (mailOn && mailOn !== c.email)) throw notFound('We could not find a guest order with that number and phone.')
  o.customerId = c._id as never
  o.guestPhone = null
  await o.save()
  res.json({ ok: true, orderNo: o.orderNo })
})
