import mongoose from 'mongoose'
import { env } from './env.js'

let memory: { stop: () => Promise<unknown>; getUri: () => string } | null = null

/** Connects to Atlas when MONGODB_URI is set, otherwise to an in-memory MongoDB (development and tests only). */
export async function connectDb(): Promise<{ inMemory: boolean }> {
  if (env.MONGODB_URI) {
    await mongoose.connect(env.MONGODB_URI)
    return { inMemory: false }
  }
  if (env.NODE_ENV === 'production') throw new Error('MONGODB_URI is required in production')
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const server = await MongoMemoryServer.create()
  memory = server
  await mongoose.connect(server.getUri('rajufishes'))
  return { inMemory: true }
}

export async function disconnectDb() {
  await mongoose.disconnect()
  if (memory) await memory.stop()
  memory = null
}
