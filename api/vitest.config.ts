import { defineConfig } from 'vitest/config'

// Tests always use a throwaway in-memory database, whatever is in .env.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test', LOGIN_MODE: 'otp', MAIL_PROVIDER: 'log', OWNER_EMAIL: '', MONGODB_URI: '', OTP_MODE: 'test', OTP_TEST_CODE: '123456',
      RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '', RAZORPAY_WEBHOOK_SECRET: '',
      CUSTOMER_JWT_SECRET: 'test-customer-secret', ADMIN_JWT_SECRET: 'test-admin-secret',
      SEED_ADMIN_EMAIL: 'owner@rajufishes.test', SEED_ADMIN_PASSWORD: 'test-admin-pass-123',
    },
  },
})
