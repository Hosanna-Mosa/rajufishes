import mongoose from 'mongoose'
import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { createApp } from './app.js'
import { seed } from './seed/seed.js'
import { startExpiryJob } from './jobs/expire.js'
import { Product } from './models/Product.js'
import { Order } from './models/Order.js'

const { inMemory } = await connectDb()
if (inMemory) {
  console.log('MONGODB_URI is empty: using an in-memory database. Data resets when the API restarts.')
  await seed({ log: false })
  console.log('Sample data loaded.')
} else {
  // make sure the database indexes exist (a no-op when they already do)
  await Promise.all([Product.syncIndexes(), Order.syncIndexes()]).catch((e) => console.warn('Index check failed:', e instanceof Error ? e.message : e))
}
if (env.MAIL_PROVIDER === 'log' || !env.OWNER_EMAIL) {
  console.log(`New-order email: ${env.OWNER_EMAIL ? 'MAIL_PROVIDER=log, emails are printed here and not sent.' : 'OWNER_EMAIL is empty, so no email will be sent.'}`)
}
const stopJob = startExpiryJob()
const server = createApp().listen(env.PORT, () => console.log(`API ready on port ${env.PORT} (${env.NODE_ENV})`))

// hosts send SIGTERM on every deploy: finish the requests in flight, then leave
function shutdown() {
  console.log('Shutting down')
  stopJob?.()
  server.close(async () => { await mongoose.disconnect().catch(() => {}); process.exit(0) })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
