import { env } from '../config/env.js'
import { Router } from 'express'
import { z } from 'zod'
import { Product } from '../models/Product.js'
import { Coupon } from '../models/Coupon.js'
import { DeliveryZone, getSettings } from '../models/DeliveryZone.js'
import { limiter, validate } from '../middleware/common.js'
import { cartItem, pincode } from '../lib/schemas.js'
import { INDIA_STATES } from '../data/states.js'
import { notFound } from '../lib/errors.js'
import { matchZone, deliveryCharge } from '../services/delivery.js'
import { couponDiscount, quote } from '../services/pricing.js'

export const publicRouter = Router()

const publicProduct = (p: any) => ({ ...p, available: p.active && (p.trackStock === false || p.stock > 0) })

publicRouter.get('/products', validate({ query: z.object({
  category: z.enum(['fresh', 'dry', 'frozen']).optional(),
  group: z.string().max(200).optional(), // one group, or several separated by commas
  q: z.string().trim().max(60).optional(),
  sort: z.enum(['landed', 'price_asc', 'price_desc', 'name']).default('landed'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
}).strict() }), async (req, res) => {
  const { category, group, q, sort, page, limit } = req.valid.query as { category?: string; group?: string; q?: string; sort: string; page: number; limit: number }
  const filter: Record<string, unknown> = { active: true }
  if (category) filter.category = category
  if (group) filter.group = { $in: group.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 8) }
  if (q && q.length >= 2) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } // read-only, case-insensitive, typed text is escaped
    filter.$or = [{ name: rx }, { category: rx }, { group: rx }]
  }
  const order: Record<string, 1 | -1> = sort === 'price_asc' ? { price: 1 } : sort === 'price_desc' ? { price: -1 } : sort === 'name' ? { name: 1 } : { landedAt: -1, name: 1 }
  const [items, total, groups] = await Promise.all([
    Product.find(filter).sort(order).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
    Product.aggregate([{ $match: { active: true } }, { $group: { _id: { group: '$group', category: '$category' }, n: { $sum: 1 } } }]),
  ])
  res.json({
    items: items.map(publicProduct), total, page, pages: Math.max(1, Math.ceil(total / limit)),
    counts: groups.map((g) => ({ group: g._id.group, category: g._id.category, count: g.n })),
  })
})

publicRouter.get('/products/:slug', async (req, res) => {
  const p = await Product.findOne({ slug: String(req.params.slug).toLowerCase(), active: true }).lean()
  if (!p) throw notFound('Product not found')
  const related = await Product.find({ active: true, _id: { $ne: p._id }, category: p.category }).limit(4).lean()
  res.json({ product: publicProduct(p), related: related.map(publicProduct) })
})

publicRouter.get('/market', async (_req, res) => {
  const items = await Product.find({ active: true, marketListed: true }).sort({ marketOrder: 1 }).lean()
  res.json({ items: items.map(publicProduct), updatedAt: items.reduce<Date | null>((m, p) => (p.landedAt && (!m || p.landedAt > m) ? p.landedAt : m), null) })
})

publicRouter.get('/meta/slots', async (_req, res) => res.json({ slots: (await getSettings()).deliverySlots }))
publicRouter.get('/meta/contact', async (_req, res) => {
  const s = await getSettings()
  res.json({ contact: { businessName: s.businessName, phone: s.stallPhone, whatsapp: s.whatsapp, email: s.stallEmail, address: s.stallAddress, hours: s.openingHours } })
})
/** What the website needs on every page: login mode, the free-delivery amount, and the shop details set in the admin panel. */
publicRouter.get('/meta/site', async (_req, res) => {
  const [s, zone] = await Promise.all([getSettings(), DeliveryZone.findOne({ active: true, isDefault: true }).lean()])
  res.json({
    loginMode: env.LOGIN_MODE, freeOver: zone?.freeOver ?? null,
    contact: { businessName: s.businessName, phone: s.stallPhone, whatsapp: s.whatsapp, email: s.stallEmail, address: s.stallAddress, hours: s.openingHours },
  })
})
publicRouter.get('/meta/states', (_req, res) => res.json({ states: INDIA_STATES }))

publicRouter.get('/delivery/check', limiter(60_000, 60), validate({ query: z.object({ pincode, state: z.string().max(60).optional() }) }), async (req, res) => {
  const { pincode: pin, state } = req.valid.query
  const [zones, settings] = await Promise.all([DeliveryZone.find({ active: true }).lean(), getSettings()])
  const zone = matchZone(zones, pin, state)
  if (!zone) return res.json({ deliverable: false, message: 'We do not deliver to this pincode yet.' })
  res.json({
    deliverable: true, zone: zone.name, charge: zone.charge, freeOver: zone.freeOver, etaDays: zone.etaDays,
    codAllowed: zone.codAllowed, freshAllowed: !settings.restrictFreshToZones || zone.freshAllowed,
    freshMessage: !settings.restrictFreshToZones || zone.freshAllowed ? null : settings.freshOnlyMessage,
  })
})

const quoteBody = z.object({
  items: z.array(cartItem).max(50),
  couponCode: z.string().trim().max(30).nullish(),
  pincode: pincode.nullish(),
  state: z.string().max(60).nullish(),
  paymentMethod: z.enum(['razorpay', 'cod']).optional(),
}).strict()

publicRouter.post('/cart/quote', limiter(60_000, 60), validate({ body: quoteBody }), async (req, res) => {
  res.json(await quote(req.valid.body))
})

publicRouter.post('/coupons/validate', limiter(60_000, 30), validate({ body: z.object({ code: z.string().trim().max(30), subtotal: z.number().int().min(0) }).strict() }), async (req, res) => {
  const c = await Coupon.findOne({ code: req.valid.body.code.toUpperCase() }).lean()
  const r = couponDiscount(c, req.valid.body.subtotal)
  if ('error' in r) return res.status(400).json({ error: r.error })
  res.json({ code: c!.code, discount: r.discount })
})
// deliveryCharge is re-exported for tests of the route layer
export { deliveryCharge }
