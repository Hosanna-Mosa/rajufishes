import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { createApp } from './app.js'
import { seed } from './seed/seed.js'
import { startExpiryJob } from './jobs/expire.js'

const { inMemory } = await connectDb()
if (inMemory) {
  console.log('MONGODB_URI is empty: using an in-memory database. Data resets when the API restarts.')
  await seed({ log: false })
  console.log('Sample data loaded.')
}
startExpiryJob()
createApp().listen(env.PORT, () => console.log(`API ready on http://localhost:${env.PORT}`))
