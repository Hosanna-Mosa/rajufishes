import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { errorHandler, limiter, sanitize } from './middleware/common.js'
import { publicRouter } from './routes/public.js'
import { authRouter } from './routes/auth.js'
import { ordersRouter, paymentsRouter, razorpayWebhook } from './routes/orders.js'
import { adminRouter } from './routes/admin.js'
import { UPLOAD_DIR } from './services/uploads.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // behind one host proxy in production, so rate limits see the real IP
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()), credentials: true }))
  app.use(limiter(15 * 60_000, 600))
  // the Razorpay webhook needs the raw bytes to check its signature, so it comes before the JSON parser
  app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '100kb' }), razorpayWebhook)
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use(sanitize)

  // development-only photo folder (used when Cloudinary keys are empty); the web site shows these images
  app.use('/uploads', (_req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next() }, express.static(UPLOAD_DIR, { fallthrough: false, index: false, dotfiles: 'deny' }))
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api', publicRouter, authRouter, ordersRouter, paymentsRouter)
  app.use('/api/admin', adminRouter)
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
  app.use(errorHandler)
  return app
}
