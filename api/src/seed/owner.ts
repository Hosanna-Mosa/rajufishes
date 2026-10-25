import bcrypt from 'bcryptjs'
import { connectDb, disconnectDb } from '../config/db.js'
import { AdminUser } from '../models/AdminUser.js'
import { DeliveryZone, getSettings } from '../models/DeliveryZone.js'

/**
 * Production first run: creates the owner login (from OWNER_EMAIL and OWNER_PASSWORD), one "All India" delivery zone and the
 * settings row. It adds NO sample products or coupons. Safe to run again: it never changes an existing login.
 */
const email = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase()
const password = process.env.OWNER_PASSWORD ?? ''
if (!email || password.length < 10) {
  console.error('Set OWNER_EMAIL and OWNER_PASSWORD (at least 10 characters) when you run this, for example:\n  OWNER_EMAIL=you@example.in OWNER_PASSWORD="a long password" npm run create-owner --prefix api')
  process.exit(1)
}
const { inMemory } = await connectDb()
if (inMemory) console.log('MONGODB_URI is empty, so this only touched a temporary database. Set MONGODB_URI to use the real one.')
const made = await AdminUser.updateOne({ email }, { $setOnInsert: { email, name: 'Owner', role: 'owner', passwordHash: await bcrypt.hash(password, 12) } }, { upsert: true })
console.log(made.upsertedCount ? `Owner login created: ${email}` : `An admin with ${email} already exists. Nothing changed.`)
if (!(await DeliveryZone.exists({ isDefault: true }))) {
  await DeliveryZone.create({ name: 'All India', isDefault: true, charge: 6000, freeOver: 99900, etaDays: 3, codAllowed: true, freshAllowed: true })
  console.log('Default delivery zone created (change the charges in Admin > Delivery).')
}
await getSettings()
await disconnectDb()
