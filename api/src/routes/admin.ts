import express, { Router, type RequestHandler } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { AdminUser } from '../models/AdminUser.js'
import { Product } from '../models/Product.js'
import { Order, ORDER_STATUSES } from '../models/Order.js'
import { Coupon } from '../models/Coupon.js'
import { Customer } from '../models/Customer.js'
import { DeliveryZone, Settings, getSettings } from '../models/DeliveryZone.js'
import { ADMIN_COOKIE, cookieOpts, limiter, requireAdmin, validate } from '../middleware/common.js'
import { objectId, pincode, rupeesPaise } from '../lib/schemas.js'
import { HttpError, notFound } from '../lib/errors.js'
import { signAdmin } from '../services/tokens.js'
import { changeStatus } from '../services/orders.js'
import { refundPayment } from '../services/razorpay.js'
import { cloudinaryIsOn, storeImage } from '../services/uploads.js'
import { matchZone } from '../services/delivery.js'
import { INDIA_STATES } from '../data/states.js'

export const adminRouter = Router()
const id = z.object({ id: objectId })
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ---- auth ----
adminRouter.post('/auth/login', limiter(15 * 60_000, 8, 'Too many sign in tries. Please wait 15 minutes.'),
  validate({ body: z.object({ email: z.email().max(120), password: z.string().min(1).max(200) }).strict() }), async (req, res) => {
    const u = await AdminUser.findOne({ email: req.valid.body.email.toLowerCase(), active: true })
    const ok = await bcrypt.compare(req.valid.body.password, u?.passwordHash ?? DUMMY_HASH) // same work whether or not the email exists
    if (!u || !ok) throw new HttpError(401, 'Wrong email or password.')
    u.lastLoginAt = new Date()
    await u.save()
    res.cookie(ADMIN_COOKIE, signAdmin(String(u._id), u.role as 'owner' | 'staff'), cookieOpts(8 * 3600_000))
    res.json({ admin: { id: u._id, email: u.email, name: u.name, role: u.role } })
  })
adminRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: '/' })
  res.json({ ok: true })
})
adminRouter.get('/auth/me', requireAdmin(), async (req, res) => {
  const u = await AdminUser.findById(req.admin!.id).select('email name role active').lean()
  if (!u || !u.active) throw new HttpError(401, 'Admin sign in required.')
  res.json({ admin: { id: u._id, email: u.email, name: u.name, role: u.role } })
})

// the token only proves who signed in; the account itself is checked every time, so a removed
// or demoted staff member loses access at once instead of when the 8 hour token runs out
adminRouter.use(requireAdmin(), (async (req, _res, next) => {
  const u = await AdminUser.findById(req.admin!.id).select('role active').lean()
  if (!u || !u.active) throw new HttpError(401, 'Admin sign in required.')
  req.admin!.role = u.role as 'owner' | 'staff'
  next()
}) as RequestHandler)

// ---- dashboard ----
// unpaid online orders are left out of the normal lists
const paidOrCod: Record<string, any> = { $nor: [{ 'payment.method': 'razorpay', 'payment.status': { $in: ['pending', 'failed'] } }] }
adminRouter.get('/dashboard', async (_req, res) => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const [newToday, toPack, waitingForPayment, lowStock, sales] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: start }, ...paidOrCod }),
    Order.countDocuments({ status: 'placed', ...paidOrCod }),
    Order.countDocuments({ status: 'placed', 'payment.method': 'razorpay', 'payment.status': 'pending' }),
    Product.find({ active: true, trackStock: true, stock: { $lte: 5 } }).select('name stock unit').sort({ stock: 1 }).limit(20).lean(),
    Order.aggregate([{ $match: { createdAt: { $gte: start }, status: { $ne: 'cancelled' }, ...paidOrCod } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
  ])
  res.json({ newToday, salesToday: sales[0]?.total ?? 0, toPack, waitingForPayment, lowStock })
})

// ---- products ----
const productFields = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80).optional(),
  category: z.enum(['fresh', 'dry', 'frozen']),
  group: z.string().trim().min(1).max(40),
  description: z.string().max(2000).optional(),
  note: z.string().max(120).optional(),
  unit: z.enum(['kg', 'pack']),
  price: rupeesPaise,
  packWeightG: z.number().int().min(1).max(50_000).optional(),
  cuts: z.array(z.object({ name: z.string().trim().min(1).max(40), priceDeltaPerKg: z.number().int().min(-1_000_000).max(1_000_000).default(0) })).max(10).default([]),
  weights: z.array(z.number().int().min(1).max(50_000)).max(10).default([]),
  stock: z.number().min(0).max(1_000_000),
  trackStock: z.boolean().default(true),
  images: z.array(z.object({ url: z.url().max(500), publicId: z.string().max(200).optional(), alt: z.string().max(160).optional() })).max(5).default([]),
  landedAt: z.coerce.date().nullish(),
  addedOn: z.coerce.date().nullish(),
  marketListed: z.boolean().default(false),
  marketOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
}).strict()
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const checkUnit = (p: { unit?: string; packWeightG?: number | null; weights?: number[] }) => {
  if (p.unit === 'pack' && !p.packWeightG) throw new HttpError(400, 'A pack product needs a pack weight.')
  if (p.unit === 'kg' && !p.weights?.length) throw new HttpError(400, 'A per-kg product needs at least one weight.')
}

adminRouter.get('/products', validate({ query: z.object({
  q: z.string().max(60).optional(), active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(200).default(50),
}) }), async (req, res) => {
  const { q, active, page, limit } = req.valid.query
  const f: Record<string, unknown> = {}
  if (q) f.name = { $regex: esc(q), $options: 'i' }
  if (active) f.active = active === 'true'
  const [items, total] = await Promise.all([
    Product.find(f).sort({ category: 1, name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(f),
  ])
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})
adminRouter.get('/products/:id', validate({ params: id }), async (req, res) => {
  const p = await Product.findById(req.valid.params.id).lean()
  if (!p) throw notFound()
  res.json({ product: p })
})
adminRouter.post('/products', validate({ body: productFields }), async (req, res) => {
  checkUnit(req.valid.body)
  const b = req.valid.body
  const { addedOn, landedAt, ...rest } = b
  res.status(201).json({ product: await Product.create({ ...rest, ...(addedOn ? { addedOn } : {}), ...(landedAt && b.category === 'fresh' ? { landedAt } : {}), slug: b.slug ?? slugify(b.name) }) })
})
adminRouter.patch('/products/:id', validate({ params: id, body: productFields.partial() }), async (req, res) => {
  const p = await Product.findById(req.valid.params.id)
  if (!p) throw notFound()
  const wasLive = p.active
  // a partial update changes only what was sent (the schema's defaults must not wipe the other fields)
  const sent = Object.fromEntries(Object.entries(req.valid.body).filter(([k]) => k in (req.body ?? {})))
  p.set(sent)
  if (!wasLive && p.active && req.valid.body.active === true && !req.valid.body.addedOn) p.addedOn = new Date() // put back on the shop = added today
  if (p.category !== 'fresh') p.landedAt = undefined // only fresh items carry a caught date
  checkUnit(p.toObject())
  await p.save()
  res.json({ product: p })
})
// morning routine: stamp fresh items as caught today (IST day is read from the saved moment)
adminRouter.post('/products/mark-caught', validate({ body: z.object({ ids: z.array(objectId).min(1).max(100) }).strict() }), async (req, res) => {
  const r = await Product.updateMany({ _id: { $in: req.valid.body.ids }, category: 'fresh' }, { $set: { landedAt: new Date() } })
  res.json({ ok: true, updated: r.modifiedCount })
})
adminRouter.post('/products/:id/landed-today', validate({ params: id }), async (req, res) => {
  const p = await Product.findById(req.valid.params.id)
  if (!p) throw notFound()
  if (p.category !== 'fresh') throw new HttpError(400, 'Only fresh items have a caught day.')
  p.landedAt = new Date()
  await p.save()
  res.json({ product: p })
})
adminRouter.patch('/products/:id/stock', validate({ params: id, body: z.object({ stock: z.number().min(0).max(1_000_000) }).strict() }), async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.valid.params.id, { $set: { stock: req.valid.body.stock } }, { returnDocument: 'after' })
  if (!p) throw notFound()
  res.json({ product: p })
})
adminRouter.patch('/products/:id/price', validate({ params: id, body: z.object({ price: rupeesPaise }).strict() }), async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.valid.params.id, { $set: { price: req.valid.body.price } }, { returnDocument: 'after' })
  if (!p) throw notFound()
  res.json({ product: p })
})
// hides the product instead of deleting it, so old orders keep working
adminRouter.delete('/products/:id', validate({ params: id }), async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.valid.params.id, { $set: { active: false, marketListed: false } }, { returnDocument: 'after' })
  if (!p) throw notFound()
  res.json({ product: p })
})

// ---- today's market board ----
adminRouter.get('/market', async (_req, res) => {
  res.json({ items: await Product.find({ active: true }).sort({ marketListed: -1, marketOrder: 1, category: 1, name: 1 }).lean() })
})
adminRouter.put('/market', validate({ body: z.object({ items: z.array(z.object({
  productId: objectId, price: rupeesPaise, stock: z.number().min(0).max(1_000_000), landedAt: z.coerce.date().nullish(), order: z.number().int().min(0).default(0), listed: z.boolean(),
}).strict()).max(60) }).strict() }), async (req, res) => {
  const items = req.valid.body.items as { productId: string; price: number; stock: number; landedAt?: Date | null; order: number; listed: boolean }[]
  await Product.bulkWrite(items.map((i) => ({
    updateOne: {
      filter: { _id: i.productId },
      update: { $set: { price: i.price, stock: i.stock, marketListed: i.listed, marketOrder: i.order, ...(i.landedAt ? { landedAt: i.landedAt } : {}) } },
    },
  })))
  res.json({ ok: true, updated: items.length })
})

// ---- orders ----
adminRouter.get('/orders', validate({ query: z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  payment: z.enum(['paid', 'pending', 'cod_due', 'cod_collected', 'refunded', 'failed']).optional(),
  method: z.enum(['cod', 'razorpay']).optional(),
  q: z.string().trim().max(30).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(30),
}) }), async (req, res) => {
  const { status, payment, method, q, from, to, page, limit } = req.valid.query
  const f: Record<string, any> = payment ? { 'payment.status': payment } : { ...paidOrCod }
  if (status) f.status = status
  if (method) f['payment.method'] = method
  if (q) f.$or = [{ orderNo: q.replace(/^#/, '') }, { 'contact.phone': q.replace(/\D/g, '').slice(-10) || '-' }]
  if (from || to) f.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) }
  const [items, total] = await Promise.all([
    Order.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(f),
  ])
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})
/** Confirmed orders still waiting to be packed (cash orders, and online orders once paid). The admin screens poll this to alert the family. */
adminRouter.get('/orders/alerts', async (_req, res) => {
  const since = new Date(Date.now() - 3 * 24 * 3600_000)
  const items = await Order.find({ ...paidOrCod, status: 'placed', createdAt: { $gte: since } })
    .sort({ createdAt: -1 }).limit(50).select('orderNo total createdAt contact.name').lean()
  res.json({ items })
})
adminRouter.get('/orders/:id', validate({ params: id }), async (req, res) => {
  const o = await Order.findById(req.valid.params.id).lean()
  if (!o) throw notFound()
  res.json({ order: o })
})
adminRouter.patch('/orders/:id/status', validate({ params: id, body: z.object({ status: z.enum(['packed', 'shipped', 'delivered', 'cancelled']), note: z.string().trim().max(300).optional() }).strict()
  .refine((b) => b.status !== 'cancelled' || !!b.note, { message: 'Please give a reason for cancelling.', path: ['note'] }) }), async (req, res) => {
  const o = await changeStatus(req.valid.params.id, req.valid.body.status, `admin:${req.admin!.id}`, { note: req.valid.body.note, owner: req.admin!.role === 'owner' })
  res.json({ order: o })
})
adminRouter.patch('/orders/:id/note', validate({ params: id, body: z.object({ adminNote: z.string().max(1000).optional(), trackingNote: z.string().max(300).optional() }).strict() }), async (req, res) => {
  const o = await Order.findByIdAndUpdate(req.valid.params.id, { $set: req.valid.body }, { returnDocument: 'after' })
  if (!o) throw notFound()
  res.json({ order: o })
})
adminRouter.post('/orders/:id/mark-cod-collected', validate({ params: id }), async (req, res) => {
  const o = await Order.findOneAndUpdate(
    { _id: req.valid.params.id, 'payment.method': 'cod', 'payment.status': 'cod_due', status: { $ne: 'cancelled' } },
    { $set: { 'payment.status': 'cod_collected', 'payment.paidAt': new Date() } }, { returnDocument: 'after' })
  if (!o) throw new HttpError(409, 'This order is not waiting for cash on delivery.')
  res.json({ order: o })
})

// ---- delivery zones and settings (owner changes) ----
const owner: RequestHandler = (req, _res, next) => (req.admin?.role === 'owner' ? next() : next(new HttpError(403, 'Owner access only.')))
const zoneFields = z.object({
  name: z.string().trim().min(1).max(60),
  match: z.object({
    pincodes: z.array(pincode).max(2000).default([]),
    pincodePrefixes: z.array(z.string().regex(/^[1-9]\d{2,4}$/)).max(500).default([]),
    states: z.array(z.enum(INDIA_STATES)).max(40).default([]),
  }).default({ pincodes: [], pincodePrefixes: [], states: [] }),
  isDefault: z.boolean().default(false),
  charge: rupeesPaise, freeOver: rupeesPaise, minOrder: rupeesPaise.default(0),
  etaDays: z.number().int().min(0).max(30).default(3),
  codAllowed: z.boolean().default(true), freshAllowed: z.boolean().default(true), active: z.boolean().default(true),
}).strict()
const onlyOneDefault = (zoneId: unknown) => DeliveryZone.updateMany({ _id: { $ne: zoneId } }, { $set: { isDefault: false } })

adminRouter.get('/zones', owner, async (_req, res) => {
  res.json({ items: await DeliveryZone.find().sort({ isDefault: -1, name: 1 }).lean() })
})
adminRouter.get('/zones/check', owner, validate({ query: z.object({ pincode, state: z.string().optional() }) }), async (req, res) => {
  res.json({ zone: matchZone(await DeliveryZone.find({ active: true }).lean(), req.valid.query.pincode, req.valid.query.state) })
})
adminRouter.post('/zones', owner, validate({ body: zoneFields }), async (req, res) => {
  const zone = await DeliveryZone.create(req.valid.body)
  if (zone.isDefault) await onlyOneDefault(zone._id)
  res.status(201).json({ zone })
})
adminRouter.patch('/zones/:id', owner, validate({ params: id, body: zoneFields.partial() }), async (req, res) => {
  const zone = await DeliveryZone.findByIdAndUpdate(req.valid.params.id, { $set: req.valid.body }, { returnDocument: 'after' })
  if (!zone) throw notFound()
  if (zone.isDefault) await onlyOneDefault(zone._id)
  res.json({ zone })
})
adminRouter.delete('/zones/:id', owner, validate({ params: id }), async (req, res) => {
  const zone = await DeliveryZone.findById(req.valid.params.id)
  if (!zone) throw notFound()
  if (zone.isDefault) throw new HttpError(409, 'The default zone cannot be deleted. Make another zone the default first.')
  await zone.deleteOne()
  res.json({ ok: true })
})
adminRouter.get('/settings', owner, async (_req, res) => {
  res.json({ settings: await getSettings() })
})
adminRouter.patch('/settings', owner, validate({ body: z.object({
  restrictFreshToZones: z.boolean().optional(), freshOnlyMessage: z.string().max(300).optional(), codMaxTotal: rupeesPaise.optional(),
  stallPhone: z.string().max(20).optional(), whatsapp: z.string().max(20).optional(),
  businessName: z.string().trim().max(80).optional(), stallEmail: z.union([z.literal(''), z.string().trim().email().max(120)]).optional(),
  stallAddress: z.string().trim().max(400).optional(), openingHours: z.string().trim().max(200).optional(),
}).strict() }), async (req, res) => {
  await getSettings()
  res.json({ settings: await Settings.findOneAndUpdate({ key: 'main' }, { $set: req.valid.body }, { returnDocument: 'after' }) })
})

// ---- coupons (owner changes) ----
const couponBase = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/),
  type: z.enum(['percent', 'flat']),
  value: z.number().int().min(1).max(100_000_000),
  maxDiscount: rupeesPaise.default(0), minSubtotal: rupeesPaise.default(0),
  startsAt: z.coerce.date().nullish(), endsAt: z.coerce.date().nullish(),
  usageLimit: z.number().int().min(0).default(0), perCustomerLimit: z.number().int().min(0).default(1), active: z.boolean().default(true),
}).strict()
const percentOk = (c: { type?: string; value?: number }) => c.type !== 'percent' || c.value === undefined || c.value <= 100
const couponFields = couponBase.refine(percentOk, { message: 'A percent coupon cannot be over 100', path: ['value'] })
adminRouter.get('/coupons', owner, async (_req, res) => {
  res.json({ items: await Coupon.find().sort({ createdAt: -1 }).lean() })
})
adminRouter.post('/coupons', owner, validate({ body: couponFields }), async (req, res) => {
  res.status(201).json({ coupon: await Coupon.create(req.valid.body) })
})
adminRouter.patch('/coupons/:id', owner, validate({ params: id, body: couponBase.omit({ code: true }).partial().refine(percentOk, { message: 'A percent coupon cannot be over 100', path: ['value'] }) }), async (req, res) => {
  const c = await Coupon.findById(req.valid.params.id)
  if (!c) throw notFound()
  // only the fields the form sent (the schema fills defaults for the rest)
  const sent = Object.keys(req.body ?? {})
  c.set(Object.fromEntries(Object.entries(req.valid.body).filter(([k]) => sent.includes(k))))
  if (c.type === 'percent' && c.value > 100) throw new HttpError(400, 'A percent coupon cannot be over 100')
  await c.save()
  res.json({ coupon: c })
})
adminRouter.delete('/coupons/:id', owner, validate({ params: id }), async (req, res) => {
  const c = await Coupon.findByIdAndDelete(req.valid.params.id)
  if (!c) throw notFound()
  res.json({ ok: true })
})

// ---- refund (Razorpay through the adapter, or just recorded for cash) ----
adminRouter.post('/orders/:id/refund', validate({ params: id, body: z.object({ amount: rupeesPaise.optional(), reason: z.string().trim().min(1).max(300) }).strict() }), async (req, res) => {
  const o0 = await Order.findById(req.valid.params.id).lean()
  if (!o0) throw notFound()
  const amount = req.valid.body.amount ?? o0.total!
  if (amount < 1 || amount > o0.total!) throw new HttpError(400, 'The refund cannot be more than the order total.')
  // claim the order first so two clicks cannot refund twice
  const claimed = await Order.findOneAndUpdate(
    { _id: o0._id, 'payment.status': { $in: ['paid', 'cod_collected'] } },
    { $set: { 'payment.status': 'refunded' } }, { returnDocument: 'before' })
  if (!claimed) throw new HttpError(409, 'Only a paid order can be refunded (and only once).')
  let refundId = 'cash'
  let mock = false
  try {
    if (claimed.payment!.method === 'razorpay') {
      if (!claimed.payment!.razorpayPaymentId) throw new HttpError(409, 'This order has no payment id to refund.')
      const r = await refundPayment(claimed.payment!.razorpayPaymentId, amount)
      refundId = r.id; mock = r.mock
    }
  } catch (e) {
    await Order.updateOne({ _id: o0._id }, { $set: { 'payment.status': claimed.payment!.status } })
    throw e
  }
  const line = `Refunded ₹${amount / 100} on ${new Date().toISOString().slice(0, 10)}${mock ? ' (test mode, no real money moved)' : ''}: ${req.valid.body.reason}`
  const o = await Order.findByIdAndUpdate(o0._id, {
    $set: { 'payment.refundId': refundId, 'payment.refundAmount': amount, 'payment.refundedAt': new Date(), 'payment.refundNote': req.valid.body.reason, adminNote: `${o0.adminNote ?? ''}\n${line}`.trim() },
  }, { returnDocument: 'after' })
  res.json({ order: o, mock })
})

// ---- customers ----
adminRouter.get('/customers', validate({ query: z.object({ q: z.string().trim().max(40).optional(), page: z.coerce.number().int().min(1).default(1) }) }), async (req, res) => {
  const { q, page } = req.valid.query
  const f: Record<string, unknown> = {}
  if (q) f.$or = [{ name: { $regex: esc(q), $options: 'i' } }, { phone: { $regex: esc(q.replace(/\D/g, '') || '-') } }]
  const limit = 40
  const [items, total] = await Promise.all([
    Customer.find(f).select('name phone email createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Customer.countDocuments(f),
  ])
  const stats = await Order.aggregate([
    { $match: { customerId: { $in: items.map((c) => c._id) }, status: { $ne: 'cancelled' }, ...paidOrCod } },
    { $group: { _id: '$customerId', orders: { $sum: 1 }, spent: { $sum: '$total' }, last: { $max: '$createdAt' } } },
  ])
  const by = new Map(stats.map((s) => [String(s._id), s]))
  res.json({ items: items.map((c) => ({ ...c, orders: by.get(String(c._id))?.orders ?? 0, spent: by.get(String(c._id))?.spent ?? 0, lastOrderAt: by.get(String(c._id))?.last ?? null })), total, pages: Math.max(1, Math.ceil(total / limit)) })
})
adminRouter.get('/customers/:id', validate({ params: id }), async (req, res) => {
  const c = await Customer.findById(req.valid.params.id).select('name phone email createdAt').lean()
  if (!c) throw notFound()
  const orders = await Order.find({ customerId: c._id, ...paidOrCod }).sort({ createdAt: -1 }).limit(100).select('orderNo status total createdAt payment.method payment.status').lean()
  res.json({ customer: c, orders })
})

// ---- photo upload (Cloudinary, or a local folder in development) ----
adminRouter.post('/uploads', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '6mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, 'Please upload a JPG, PNG or WebP photo (up to 6 MB).')
  const origin = `${req.protocol}://${req.get('host')}`
  res.status(201).json(await storeImage(req.body, origin))
})
adminRouter.get('/uploads/status', (_req, res) => {
  res.json({ storage: cloudinaryIsOn() ? 'cloudinary' : 'local' })
})

// ---- staff (owner only) ----
const password = z.string().min(10, 'Use at least 10 characters.').max(100)
const staffView = (u: { _id: unknown; email: string; name?: string | null; role: string; active: boolean; lastLoginAt?: Date | null }) =>
  ({ id: u._id, email: u.email, name: u.name ?? '', role: u.role, active: u.active, lastLoginAt: u.lastLoginAt ?? null })

adminRouter.post('/auth/password', limiter(15 * 60_000, 10), validate({ body: z.object({ current: z.string().max(200), next: password }).strict() }), async (req, res) => {
  const u = await AdminUser.findById(req.admin!.id)
  if (!u || !(await bcrypt.compare(req.valid.body.current, u.passwordHash))) throw new HttpError(400, 'Your current password is not right.')
  u.passwordHash = await bcrypt.hash(req.valid.body.next, 10)
  await u.save()
  res.json({ ok: true })
})
adminRouter.get('/staff', owner, async (_req, res) => {
  res.json({ items: (await AdminUser.find().sort({ role: 1, name: 1 }).lean()).map(staffView) })
})
adminRouter.post('/staff', owner, validate({ body: z.object({ email: z.email().max(120), name: z.string().trim().min(1).max(80), password }).strict() }), async (req, res) => {
  const b = req.valid.body
  if (await AdminUser.exists({ email: b.email.toLowerCase() })) throw new HttpError(409, 'Someone with that email already has a login.')
  const u = await AdminUser.create({ email: b.email, name: b.name, passwordHash: await bcrypt.hash(b.password, 10), role: 'staff' })
  res.status(201).json({ staff: staffView(u) })
})
adminRouter.patch('/staff/:id/password', owner, validate({ params: id, body: z.object({ password }).strict() }), async (req, res) => {
  const u = await AdminUser.findById(req.valid.params.id)
  if (!u) throw notFound()
  u.passwordHash = await bcrypt.hash(req.valid.body.password, 10)
  await u.save()
  res.json({ ok: true })
})
adminRouter.delete('/staff/:id', owner, validate({ params: id }), async (req, res) => {
  const u = await AdminUser.findById(req.valid.params.id)
  if (!u) throw notFound()
  if (String(u._id) === req.admin!.id) throw new HttpError(409, 'You cannot remove your own login.')
  if (u.role === 'owner') throw new HttpError(409, 'An owner login cannot be removed here.')
  await u.deleteOne()
  res.json({ ok: true })
})
