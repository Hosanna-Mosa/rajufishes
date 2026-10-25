import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { Product } from '../models/Product.js'
import { Coupon } from '../models/Coupon.js'
import { AdminUser } from '../models/AdminUser.js'
import { DeliveryZone, getSettings } from '../models/DeliveryZone.js'

const rs = (n: number) => n * 100 // rupees to paise
const KG = [500, 1000, 2000]

function landedToday() {
  const d = new Date()
  d.setHours(5, 40, 0, 0)
  return d
}

// Sample products and prices from the designs. Real prices, stock and photos come from the family.
const fresh = (name: string, slug: string, group: string, note: string, price: number, stock: number, extra: object = {}) => ({
  name, slug, category: 'fresh' as const, group, note, unit: 'kg' as const, price: rs(price), weights: KG, stock, ...extra,
})
const pack = (name: string, slug: string, category: 'dry' | 'frozen', group: string, note: string, grams: number, price: number, stock: number) => ({
  name, slug, category, group, note, unit: 'pack' as const, packWeightG: grams, price: rs(price), stock,
})

export const SAMPLE_PRODUCTS = [
  fresh('Seer fish steaks', 'seer-fish-steaks', 'Fresh fish', 'Cut fresh, 500 g', 899, 42, {
    description: 'Thick, boneless-style steaks cut from fish landed this morning by our boats. Cleaned and packed on ice.',
    cuts: [{ name: 'Steaks', priceDeltaPerKg: 0 }, { name: 'Whole', priceDeltaPerKg: 0 }, { name: 'Fillet', priceDeltaPerKg: 0 }],
    marketListed: true, marketOrder: 1,
  }),
  fresh('Black pomfret', 'black-pomfret', 'Fresh fish', 'Whole, cleaned', 749, 28, {
    cuts: [{ name: 'Whole', priceDeltaPerKg: 0 }, { name: 'Fillet', priceDeltaPerKg: 0 }], marketListed: true, marketOrder: 2,
  }),
  fresh('Oil sardine', 'oil-sardine', 'Fresh fish', 'Whole, cleaned', 249, 120, { marketListed: true, marketOrder: 5 }),
  fresh('Mackerel', 'mackerel', 'Fresh fish', 'Whole, cleaned', 329, 60),
  fresh('Tiger prawns', 'tiger-prawns', 'Prawns and crab', 'Large, headless', 699, 35, { marketListed: true, marketOrder: 3 }),
  fresh('White prawns', 'white-prawns', 'Prawns and crab', 'Medium, headless', 549, 40),
  fresh('Mud crab', 'mud-crab', 'Prawns and crab', 'Whole, on ice', 599, 18, { marketListed: true, marketOrder: 4 }),
  pack('Dry anchovies', 'dry-anchovies', 'dry', 'Dry fish', 'Sun-dried, 250 g', 250, 199, 80),
  pack('Dry shrimp', 'dry-shrimp', 'dry', 'Dry fish', 'Sun-dried, 250 g', 250, 249, 60),
  pack('Dry mackerel', 'dry-mackerel', 'dry', 'Dry fish', 'Salted, 250 g', 250, 229, 50),
  pack('Squid rings', 'squid-rings', 'frozen', 'Frozen packs', 'Cleaned, 500 g', 500, 349, 40),
  pack('Fish fillet pack', 'fish-fillet-pack', 'frozen', 'Frozen packs', 'Boneless, 500 g', 500, 429, 30),
]

/** Safe to run many times: it only adds what is missing and never overwrites edits the family made. */
export async function seed({ log = true }: { log?: boolean } = {}) {
  const say = (m: string) => log && console.log(m)

  for (const p of SAMPLE_PRODUCTS) {
    const { marketListed, marketOrder, ...rest } = p as typeof p & { marketListed?: boolean; marketOrder?: number }
    await Product.updateOne(
      { slug: p.slug },
      { $setOnInsert: { ...rest, marketListed: marketListed ?? false, marketOrder: marketOrder ?? 0, landedAt: p.category === 'fresh' ? landedToday() : undefined } },
      { upsert: true },
    )
  }
  say(`Products: ${await Product.countDocuments()}`)

  if (!(await DeliveryZone.exists({ isDefault: true }))) {
    await DeliveryZone.create({
      name: 'All India', isDefault: true, charge: rs(60), freeOver: rs(999), etaDays: 3, codAllowed: true, freshAllowed: true,
    }) // sample charge and free-over amount
  }
  await getSettings() // restrictFreshToZones is off by default
  say('Delivery zone and settings ready')

  await Coupon.updateOne(
    { code: 'WELCOME10' },
    { $setOnInsert: { code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: rs(100), minSubtotal: rs(499), perCustomerLimit: 1 } },
    { upsert: true },
  )

  if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    await AdminUser.updateOne(
      { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
      { $setOnInsert: { email: env.SEED_ADMIN_EMAIL.toLowerCase(), name: 'Owner', role: 'owner', passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10) } },
      { upsert: true },
    )
    say(`Admin user: ${env.SEED_ADMIN_EMAIL}`)
    if (env.SEED_STAFF_EMAIL && env.SEED_STAFF_PASSWORD) {
      await AdminUser.updateOne(
        { email: env.SEED_STAFF_EMAIL.toLowerCase() },
        { $setOnInsert: { email: env.SEED_STAFF_EMAIL.toLowerCase(), name: 'Staff', role: 'staff', passwordHash: await bcrypt.hash(env.SEED_STAFF_PASSWORD, 10) } },
        { upsert: true },
      )
      say(`Staff user: ${env.SEED_STAFF_EMAIL}`)
    }
  } else {
    console.warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: no admin user created.')
  }
}
