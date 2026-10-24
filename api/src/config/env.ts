import dotenv from 'dotenv'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const here = path.dirname(fileURLToPath(import.meta.url))
// api/.env first, then the repo root .env (existing variables are never overwritten)
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true })
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true })

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().default(''),
  CUSTOMER_JWT_SECRET: z.string().default(''),
  ADMIN_JWT_SECRET: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  OTP_MODE: z.enum(['test', 'live']).default('test'),
  OTP_TEST_CODE: z.string().default('123456'),
  SMS_PROVIDER: z.string().default(''),
  MSG91_AUTH_KEY: z.string().default(''),
  MSG91_TEMPLATE_ID: z.string().default(''),
  MSG91_SENDER_ID: z.string().default(''),
  SEED_ADMIN_EMAIL: z.string().default(''),
  SEED_ADMIN_PASSWORD: z.string().default(''),
})

export type Env = z.infer<typeof schema>

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const env = schema.parse(raw)
  const prod = env.NODE_ENV === 'production'
  if (prod) {
    const missing = ['MONGODB_URI', 'CUSTOMER_JWT_SECRET', 'ADMIN_JWT_SECRET', 'CORS_ORIGIN'].filter(
      (k) => !(env as Record<string, unknown>)[k],
    )
    if (missing.length) throw new Error(`Missing required env in production: ${missing.join(', ')}`)
    if (env.OTP_MODE === 'test') throw new Error('OTP_MODE=test is not allowed in production')
    if (env.CUSTOMER_JWT_SECRET === env.ADMIN_JWT_SECRET) throw new Error('Customer and admin JWT secrets must differ')
  } else {
    // development: random per-process secrets so nothing secret is ever written in code
    if (!env.CUSTOMER_JWT_SECRET) env.CUSTOMER_JWT_SECRET = crypto.randomBytes(32).toString('hex')
    if (!env.ADMIN_JWT_SECRET) env.ADMIN_JWT_SECRET = crypto.randomBytes(32).toString('hex')
  }
  return env
}

export const env = loadEnv()
export const isProd = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
