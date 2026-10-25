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
  LOGIN_MODE: z.enum(['guest', 'account', 'otp']).default('account'),
  OWNER_EMAIL: z.string().default(''),
  MAIL_PROVIDER: z.enum(['log', 'smtp']).default('log'),
  MAIL_FROM: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SEED_ADMIN_EMAIL: z.string().default(''),
  SEED_ADMIN_PASSWORD: z.string().default(''),
  SEED_STAFF_EMAIL: z.string().default(''),
  SEED_STAFF_PASSWORD: z.string().default(''),
})

export type Env = z.infer<typeof schema>

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const env = schema.parse(raw)
  const prod = env.NODE_ENV === 'production'
  if (prod) {
    const missing = ['MONGODB_URI', 'CUSTOMER_JWT_SECRET', 'ADMIN_JWT_SECRET', 'CORS_ORIGIN'].filter(
      (k) => !(env as Record<string, unknown>)[k],
    )
    if (missing.length) throw new Error(`The API cannot start. These settings are missing: ${missing.join(', ')}`)
    const problems: string[] = []
    const otp = env.LOGIN_MODE === 'otp' // phone-code login is switched off in guest mode, so its settings are not needed
    if (otp && env.OTP_MODE === 'test') problems.push('OTP_MODE=test is not allowed in production. Set OTP_MODE=live and the MSG91 values.')
    if (env.CUSTOMER_JWT_SECRET === env.ADMIN_JWT_SECRET) problems.push('CUSTOMER_JWT_SECRET and ADMIN_JWT_SECRET must be different.')
    for (const k of ['CUSTOMER_JWT_SECRET', 'ADMIN_JWT_SECRET'] as const) if (env[k].length < 32) problems.push(`${k} must be a long random string (at least 32 characters).`)
    if (!/^mongodb(\+srv)?:\/\//.test(env.MONGODB_URI)) problems.push('MONGODB_URI must start with mongodb:// or mongodb+srv://. Copy it from MongoDB Atlas.')
    const origins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    for (const o of origins) {
      if (!/^https:\/\/[^/\s]+$/.test(o)) problems.push(`CORS_ORIGIN "${o}" must be the full web address starting with https:// and no slash at the end, like https://www.example.in`)
      else if (/localhost|127\.0\.0\.1/.test(o)) problems.push('CORS_ORIGIN must be the real web address, not localhost.')
    }
    const group = (names: (keyof Env)[], what: string) => {
      const set = names.filter((n) => env[n]), unset = names.filter((n) => !env[n])
      if (set.length && unset.length) problems.push(`${what}: ${unset.join(', ')} is empty but ${set.join(', ')} is set. Fill in all of them or none.`)
    }
    group(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'], 'Cloudinary')
    group(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'], 'Razorpay')
    if (!env.CLOUDINARY_CLOUD_NAME) problems.push('Cloudinary keys are empty. Photos cannot be uploaded in production without them.')
    if (!env.RAZORPAY_KEY_ID) problems.push('Razorpay keys are empty. Online payment cannot work in production without them.')
    if (env.MAIL_PROVIDER === 'smtp') for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'OWNER_EMAIL'] as const) if (!env[k]) problems.push(`${k} is empty. It is needed to email you new orders.`)
    if (!otp) { /* guest mode: no SMS settings needed */ }
    else if (env.SMS_PROVIDER !== 'msg91') problems.push('SMS_PROVIDER must be msg91 when LOGIN_MODE=otp in production.')
    else for (const k of ['MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID', 'MSG91_SENDER_ID'] as const) if (!env[k]) problems.push(`${k} is empty. Copy it from your MSG91 account.`)
    if (/dev-|\.test$/.test(env.SEED_ADMIN_PASSWORD + env.SEED_ADMIN_EMAIL)) problems.push('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD still hold the development test login. Use your own, or leave them empty after the first start.')
    if (problems.length) throw new Error(`The API cannot start. Please fix these settings:\n - ${problems.join('\n - ')}`)
  } else {
    // development: random per-process secrets so nothing secret is ever written in code
    if (!env.CUSTOMER_JWT_SECRET) env.CUSTOMER_JWT_SECRET = crypto.randomBytes(32).toString('hex')
    if (!env.ADMIN_JWT_SECRET) env.ADMIN_JWT_SECRET = crypto.randomBytes(32).toString('hex')
  }
  return env
}

function startupEnv() {
  try { return loadEnv() } catch (e) {
    if (process.env.VITEST) throw e
    console.error(e instanceof Error ? e.message : e) // a plain message instead of a stack trace
    process.exit(1)
  }
}
export const env = startupEnv()
export const isProd = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
