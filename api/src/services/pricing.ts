import type { Types } from 'mongoose'
import { Product } from '../models/Product.js'
import { Coupon } from '../models/Coupon.js'
import { Order } from '../models/Order.js'
import { DeliveryZone, getSettings } from '../models/DeliveryZone.js'
import { deliveryCharge, matchZone } from './delivery.js'

export interface CartInput {
  productId: string
  cut?: string | null
  weightG?: number | null
  qty: number
}

export interface Problem {
  code: 'unavailable' | 'bad_option' | 'out_of_stock' | 'fresh_not_delivered' | 'min_order' | 'cod_not_allowed' | 'no_zone'
  message: string
  productId?: string
}

interface PricedProduct {
  _id: Types.ObjectId | string
  name: string
  slug: string
  category: string
  unit: string
  price: number
  packWeightG?: number | null
  cuts: { name: string; priceDeltaPerKg?: number | null }[]
  weights: number[]
  stock: number
  trackStock?: boolean | null
  active?: boolean | null
  images?: { url?: string | null }[]
}

export interface PricedLine {
  productId: string
  name: string
  slug: string
  image: string
  category: string
  unit: string
  cut: string | null
  weightG: number | null
  qty: number
  unitPrice: number
  lineTotal: number
  stockUse: number
}

/** Price one cart line from the product. Money is whole paise. Returns a Problem if the choice is not valid. */
export function priceLine(p: PricedProduct, input: CartInput): PricedLine | Problem {
  const productId = String(p._id)
  const bad = (message: string): Problem => ({ code: 'bad_option', message, productId })
  if (!p.active) return { code: 'unavailable', message: `${p.name} is not available right now.`, productId }

  let cut: string | null = null
  let delta = 0
  if (p.cuts.length) {
    const c = p.cuts.find((x) => x.name === input.cut)
    if (!c) return bad(`Choose a cut for ${p.name}.`)
    cut = c.name
    delta = c.priceDeltaPerKg ?? 0
  } else if (input.cut) {
    return bad(`${p.name} has no cut options.`)
  }

  let unitPrice: number
  let weightG: number | null
  let stockUnits: number // stock used per one quantity
  if (p.unit === 'kg') {
    if (!input.weightG || !p.weights.includes(input.weightG)) return bad(`Choose a weight for ${p.name}.`)
    weightG = input.weightG
    unitPrice = Math.round(((p.price + delta) * weightG) / 1000)
    stockUnits = weightG / 1000
  } else {
    weightG = p.packWeightG ?? null
    unitPrice = p.price + Math.round(((delta) * (weightG ?? 0)) / 1000)
    stockUnits = 1
  }
  return {
    productId, name: p.name, slug: p.slug, image: p.images?.[0]?.url ?? '', category: p.category, unit: p.unit,
    cut, weightG, qty: input.qty, unitPrice, lineTotal: unitPrice * input.qty,
    stockUse: p.trackStock === false ? 0 : stockUnits * input.qty,
  }
}

export interface CouponLike {
  code: string
  type: string
  value: number
  maxDiscount?: number | null
  minSubtotal?: number | null
  startsAt?: Date | null
  endsAt?: Date | null
  usageLimit?: number | null
  usedCount?: number | null
  active?: boolean | null
}

/** Discount in paise, or an error message. The discount is worked out on the subtotal. */
export function couponDiscount(c: CouponLike | null, subtotal: number, now = new Date()): { discount: number } | { error: string } {
  if (!c || !c.active) return { error: 'This coupon code is not valid.' }
  if (c.startsAt && now < c.startsAt) return { error: 'This coupon is not active yet.' }
  if (c.endsAt && now > c.endsAt) return { error: 'This coupon has expired.' }
  if (c.usageLimit && (c.usedCount ?? 0) >= c.usageLimit) return { error: 'This coupon has been fully used.' }
  if (c.minSubtotal && subtotal < c.minSubtotal) return { error: `Add items worth ₹${Math.ceil(c.minSubtotal / 100)} to use this coupon.` }
  let d = c.type === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value
  if (c.maxDiscount) d = Math.min(d, c.maxDiscount)
  return { discount: Math.min(d, subtotal) }
}

export interface QuoteOptions {
  items: CartInput[]
  couponCode?: string | null
  pincode?: string | null
  state?: string | null
  customerId?: string | null
  guestPhone?: string | null
  paymentMethod?: 'razorpay' | 'cod'
}

export async function quote(opts: QuoteOptions) {
  const problems: Problem[] = []
  const settings = await getSettings()
  const zones = await DeliveryZone.find({ active: true }).lean()
  // no pincode yet (the cart page): preview with the default zone, but raise no area problems
  const estimated = !opts.pincode
  const zone = matchZone(zones, opts.pincode ?? '', opts.state ?? undefined) ?? (estimated ? zones.find((z) => z.isDefault) ?? zones[0] ?? null : null)
  if (opts.pincode && !zone) problems.push({ code: 'no_zone', message: 'We do not deliver to this pincode yet.' })

  const ids = [...new Set(opts.items.map((i) => i.productId))]
  const products = await Product.find({ _id: { $in: ids } }).lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))

  const lines: PricedLine[] = []
  for (const item of opts.items) {
    const p = byId.get(item.productId)
    if (!p) {
      problems.push({ code: 'unavailable', message: 'A product in your cart is no longer sold.', productId: item.productId })
      continue
    }
    const res = priceLine(p as unknown as PricedProduct, item)
    if ('code' in res) problems.push(res)
    else lines.push(res)
  }

  // stock, summed per product (the same product can appear with two cuts)
  const used = new Map<string, number>()
  for (const l of lines) used.set(l.productId, (used.get(l.productId) ?? 0) + l.stockUse)
  for (const [id, need] of used) {
    const p = byId.get(id)!
    if (p.trackStock !== false && need > p.stock + 1e-9) {
      problems.push({ code: 'out_of_stock', message: `Only ${p.stock} ${p.unit === 'kg' ? 'kg' : 'left'} of ${p.name} in stock.`, productId: id })
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)

  if (!estimated && zone && settings.restrictFreshToZones && !zone.freshAllowed) {
    for (const l of lines.filter((x) => x.category === 'fresh')) {
      problems.push({ code: 'fresh_not_delivered', message: settings.freshOnlyMessage, productId: l.productId })
    }
  }
  if (!estimated && zone?.minOrder && subtotal < zone.minOrder) {
    problems.push({ code: 'min_order', message: `Minimum order for this area is ₹${Math.ceil(zone.minOrder / 100)}.` })
  }

  // coupon
  let discount = 0
  let couponError: string | null = null
  let couponCode: string | null = null
  if (opts.couponCode) {
    const coupon = await Coupon.findOne({ code: opts.couponCode.trim().toUpperCase() }).lean()
    const r = couponDiscount(coupon, subtotal)
    if ('error' in r) couponError = r.error
    else if (coupon && coupon.perCustomerLimit && (opts.customerId || opts.guestPhone)) {
      const who = opts.customerId ? { customerId: opts.customerId } : { guestPhone: opts.guestPhone }
      const used = await Order.countDocuments({ ...who, couponCode: coupon.code, status: { $ne: 'cancelled' } })
      if (used >= coupon.perCustomerLimit) couponError = 'You have already used this coupon.'
      else { discount = r.discount; couponCode = coupon.code }
    } else {
      discount = r.discount
      couponCode = coupon?.code ?? null
    }
  }

  const charge = zone ? deliveryCharge(zone, subtotal) : 0 // free-over check uses subtotal before any coupon
  const total = Math.max(0, subtotal - discount) + charge

  if (opts.paymentMethod === 'cod' && zone && !estimated) {
    if (!zone.codAllowed) problems.push({ code: 'cod_not_allowed', message: 'Cash on delivery is not available for this pincode.' })
    else if (settings.codMaxTotal && total > settings.codMaxTotal) {
      problems.push({ code: 'cod_not_allowed', message: `Cash on delivery is limited to ₹${Math.floor(settings.codMaxTotal / 100)}. Please pay online.` })
    }
  }

  return {
    estimated, lines, subtotal, deliveryCharge: charge, discount, total, couponCode, couponError, problems,
    zone: zone ? { id: String(zone._id), name: zone.name, charge: zone.charge, freeOver: zone.freeOver, etaDays: zone.etaDays ?? 3, codAllowed: zone.codAllowed !== false, freshAllowed: zone.freshAllowed !== false } : null,
    amountToFreeDelivery: zone ? Math.max(0, zone.freeOver - subtotal) : null,
  }
}
