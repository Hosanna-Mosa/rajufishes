import { connectDb, disconnectDb } from '../config/db.js'
import { seed } from './seed.js'

const { inMemory } = await connectDb()
if (inMemory) console.log('MONGODB_URI is empty: seeding a temporary in-memory database (it vanishes when this script ends).')
await seed()
await disconnectDb()
