import { describe, it, expect } from 'vitest'
import { loadEnv } from '../src/config/env.js'

const good = {
  NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://u:p@cluster.example.mongodb.net/rf',
  CUSTOMER_JWT_SECRET: 'a'.repeat(40), ADMIN_JWT_SECRET: 'b'.repeat(40), CORS_ORIGIN: 'https://www.rajufishes.example',
  CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's',
  RAZORPAY_KEY_ID: 'rzp_live_x', RAZORPAY_KEY_SECRET: 's', RAZORPAY_WEBHOOK_SECRET: 'w',
  OTP_MODE: 'live', SMS_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'a', MSG91_TEMPLATE_ID: 't', MSG91_SENDER_ID: 'RJFISH',
} as unknown as NodeJS.ProcessEnv

describe('production settings check', () => {
  it('accepts a complete set', () => {
    expect(loadEnv(good).NODE_ENV).toBe('production')
  })
  it('lists every problem in plain words', () => {
    const bad = { ...good, OTP_MODE: 'test', CORS_ORIGIN: 'http://localhost:3000', CUSTOMER_JWT_SECRET: 'short', RAZORPAY_WEBHOOK_SECRET: '' } as unknown as NodeJS.ProcessEnv
    expect(() => loadEnv(bad)).toThrowError(/OTP_MODE=test[\s\S]*CUSTOMER_JWT_SECRET[\s\S]*CORS_ORIGIN[\s\S]*Razorpay/)
  })
  it('refuses the development test login', () => {
    expect(() => loadEnv({ ...good, SEED_ADMIN_EMAIL: 'owner@rajufishes.test', SEED_ADMIN_PASSWORD: 'dev-admin-pass-123' } as unknown as NodeJS.ProcessEnv)).toThrowError(/development test login/)
  })
  it('names a missing setting', () => {
    expect(() => loadEnv({ ...good, MONGODB_URI: '' } as unknown as NodeJS.ProcessEnv)).toThrowError(/MONGODB_URI/)
  })
})
