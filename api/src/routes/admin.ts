import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { AdminUser } from '../models/AdminUser.js'
import { Product } from '../models/Product.js'
import { Order, ORDER_STATUSES } from '../models/Order.js'
import { Coupon } from '../models/Coupon.js'
import { DeliveryZone, Settings, getSettings } from '../models/DeliveryZone.js'
import { ADMIN_COOKIE, cookieOpts, limiter, requireAdmin, validate } from '../middleware/common.js'
import { objectId, pincode, rupeesPaise } from '../lib/schemas.js'
import { HttpError, notFound } from '../lib/errors.js'
import { signAdmin } from '../services/tokens.js'
import { changeStatus } from '../services/orders.js'
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
  const u = await AdminUser.findById(req.admin!.id).select('email name role').lean()
  if (!u) throw new HttpError(401, 'Admin sign in required.')
  res.json({ admin: u })
})

adminRouter.use(requireAdmin())

// ---- dashboard ----
// unpaid online orders are left out of the normal lists
const paidOrCod: Record<string, any> = { $nor: [{ 'payment.method': 'razorpay', 'payment.status': { $in: ['pending', 'failed'] } }] }
adminRouter.get('/dashboard', async (_req, res) => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const [newToday, toPack, waitingForPayment, lowStock] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: start }, ...paidOrCod }),
    Order.countDocuments({ status: 'placed', ...paidOrCod }),
    Order.countDocuments({ status: 'placed', 'payment.method': 'razorpay', 'payment.status': 'pending' }),
    Product.find({ active: true, trackStock: true, stock: { $lte: 5 } }).select('name stock unit').sort({ stock: 1 }).limit(20).lean(),
  ])
  res.json({ newToday, toPack, waitingForPayment, lowStock })
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
  marketListed: z.boolean().default(false),
  marketOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
}).strict()
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const checkUnit = (p: { unit?: string; packWeightG?: number | null; weights?: number[] }) => {
  if (p.unit === 'pack' && !p.packWeightG) throw new HttpError(400, 'A pack product needs a pack weight.')
  if (p.unit === 'kg' && !p.weights?.length) throw new HttpError(400, 'A per-kg product needs at least one weight.')
}

adminRouter.get('/products', validate({ query: z.object({ q: z.string().max(60).optional(), active: z.enum(['true', 'false']).optional() }) }), async (req, res) => {
  const { q, active } = req.valid.query
  const f: Record<string, unknown> = {}
  if (q) f.name = { $regex: esc(q), $options: 'i' }
  if (active) f.active = active === 'true'
  res.json({ items: await Product.find(f).sort({ category: 1, name: 1 }).lean() })
})
adminRouter.get('/products/:id', validate({ params: id }), async (req, res) => {
  const p = await Product.findById(req.valid.params.id).lean()
  if (!p) throw notFound()
  res.json({ product: p })
})
adminRouter.post('/products', validate({ body: productFields }), async (req, res) => {
  checkUnit(req.valid.body)
  const b = req.valid.body
  res.status(201).json({ product: await Product.create({ ...b, slug: b.slug ?? slugify(b.name) }) })
})
adminRouter.patch('/products/:id', validate({ params: id, body: productFields.partial() }), async (req, res) => {
  const p = await Product.findById(req.valid.params.id)
  if (!p) throw notFound()
  p.set(req.valid.body)
  checkUnit(p.toObject())
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
  res.json({ items: await Product.find({ active: true, category: 'fresh' }).sort({ marketListed: -1, marketOrder: 1, name: 1 }).lean() })
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
  q: z.string().trim().max(30).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(30),
}) }), async (req, res) => {
  const { status, payment, q, from, to, page, limit } = req.valid.query
  const f: Record<string, any> = payment ? { 'payment.status': payment } : { ...paidOrCod }
  if (status) f.status = status
  if (q) f.$or = [{ orderNo: q.replace(/^#/, '') }, { 'contact.phone': q.replace(/\D/g, '').slice(-10) || '-' }]
  if (from || to) f.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) }
  const [items, total] = await Promise.all([
    Order.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(f),
  ])
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})
adminRouter.get('/orders/:id', validate({ params: id }), async (req, res) => {
  const o = await Order.findById(req.valid.params.id).lean()
  if (!o) throw notFound()
  res.json({ order: o })
})
adminRouter.patch('/orders/:id/status', validate({ params: id, body: z.object({ status: z.enum(['packed', 'shipped', 'delivered', 'cancelled']), note: z.string().max(300).optional() }).strict() }), async (req, res) => {
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
const owner = requireAdmin('owner')
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

adminRouter.get('/zones', async (_req, res) => {
  res.json({ items: await DeliveryZone.find().sort({ isDefault: -1, name: 1 }).lean() })
})
adminRouter.get('/zones/check', validate({ query: z.object({ pincode, state: z.string().optional() }) }), async (req, res) => {
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
adminRouter.get('/settings', async (_req, res) => {
  res.json({ settings: await getSettings() })
})
adminRouter.patch('/settings', owner, validate({ body: z.object({
  restrictFreshToZones: z.boolean().optional(), freshOnlyMessage: z.string().max(300).optional(), codMaxTotal: rupeesPaise.optional(),
  stallPhone: z.string().max(20).optional(), whatsapp: z.string().max(20).optional(),
}).strict() }), async (req, res) => {
  await getSettings()
  res.json({ settings: await Settings.findOneAndUpdate({ key: 'main' }, { $set: req.valid.body }, { returnDocument: 'after' }) })
})

// ---- coupons (owner changes) ----
const couponFields = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/),
  type: z.enum(['percent', 'flat']),
  value: z.number().int().min(1).max(100_000_000),
  maxDiscount: rupeesPaise.default(0), minSubtotal: rupeesPaise.default(0),
  startsAt: z.coerce.date().nullish(), endsAt: z.coerce.date().nullish(),
  usageLimit: z.number().int().min(0).default(0), perCustomerLimit: z.number().int().min(0).default(1), active: z.boolean().default(true),
}).strict().refine((c) => c.type !== 'percent' || c.value <= 100, { message: 'A percent coupon cannot be over 100', path: ['value'] })
adminRouter.get('/coupons', async (_req, res) => {
  res.json({ items: await Coupon.find().sort({ createdAt: -1 }).lean() })
})
adminRouter.post('/coupons', owner, validate({ body: couponFields }), async (req, res) => {
  res.status(201).json({ coupon: await Coupon.create(req.valid.body) })
})
adminRouter.patch('/coupons/:id', owner, validate({ params: id, body: z.object({
  active: z.boolean().optional(), endsAt: z.coerce.date().nullish(), usageLimit: z.number().int().min(0).optional(),
  minSubtotal: rupeesPaise.optional(), maxDiscount: rupeesPaise.optional(), perCustomerLimit: z.number().int().min(0).optional(),
}).strict() }), async (req, res) => {
  const c = await Coupon.findByIdAndUpdate(req.valid.params.id, { $set: req.valid.body }, { returnDocument: 'after' })
  if (!c) throw notFound()
  res.json({ coupon: c })
})
adminRouter.delete('/coupons/:id', owner, validate({ params: id }), async (req, res) => {
  const c = await Coupon.findByIdAndDelete(req.valid.params.id)
  if (!c) throw notFound()
  res.json({ ok: true })
})
