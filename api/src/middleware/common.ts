import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { ZodError, type ZodType } from 'zod'
import mongoose from 'mongoose'
import { HttpError } from '../lib/errors.js'
import { isProd, isTest } from '../config/env.js'
import { verifyAdmin, verifyCustomer } from '../services/tokens.js'

/** Removes Mongo operator keys ($...) and dotted keys from anything the client sent, in place. */
function strip(v: unknown): void {
  if (!v || typeof v !== 'object') return
  for (const k of Object.keys(v as object)) {
    if (k.startsWith('$') || k.includes('.')) delete (v as Record<string, unknown>)[k]
    else strip((v as Record<string, unknown>)[k])
  }
}
export const sanitize: RequestHandler = (req, _res, next) => {
  strip(req.body); strip(req.query); strip(req.params)
  next()
}

declare module 'express-serve-static-core' {
  interface Request {
    valid: { body?: any; query?: any; params?: any }
    customerId?: string
    admin?: { id: string; role: 'owner' | 'staff' }
  }
}

export const validate = (s: { body?: ZodType; query?: ZodType; params?: ZodType }): RequestHandler => (req, _res, next) => {
  req.valid = {}
  if (s.body) req.valid.body = s.body.parse(req.body ?? {})
  if (s.query) req.valid.query = s.query.parse(req.query)
  if (s.params) req.valid.params = s.params.parse(req.params)
  next()
}

export const CUSTOMER_COOKIE = 'rf_customer'
export const ADMIN_COOKIE = 'rf_admin'
export const cookieOpts = (maxAgeMs: number) => ({ httpOnly: true, secure: isProd, sameSite: 'lax' as const, maxAge: maxAgeMs, path: '/' })

const tokenFrom = (req: Request, cookie: string) => req.cookies?.[cookie] ?? req.headers.authorization?.replace(/^Bearer /, '')

export const optionalCustomer: RequestHandler = (req, _res, next) => {
  const t = tokenFrom(req, CUSTOMER_COOKIE)
  const c = t ? verifyCustomer(t) : null
  if (c) req.customerId = c.sub
  next()
}
export const requireCustomer: RequestHandler = (req, _res, next) => {
  optionalCustomer(req, _res, () => {
    if (!req.customerId) return next(new HttpError(401, 'Please sign in.'))
    next()
  })
}
export const requireAdmin = (role?: 'owner'): RequestHandler => (req, _res, next) => {
  const t = tokenFrom(req, ADMIN_COOKIE)
  const c = t ? verifyAdmin(t) : null
  if (!c) return next(new HttpError(401, 'Admin sign in required.'))
  if (role && c.role !== role) return next(new HttpError(403, 'Owner access only.'))
  req.admin = { id: c.sub, role: c.role }
  next()
}

export const limiter = (windowMs: number, max: number, message = 'Too many requests. Please slow down.') =>
  rateLimit({ windowMs, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => isTest, message: { error: message } })

export const errorHandler: ErrorRequestHandler = (err, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Please check the form.', fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) })
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details })
  if (err instanceof mongoose.Error.CastError) return res.status(400).json({ error: 'Invalid id.' })
  if ((err as { code?: number }).code === 11000) return res.status(409).json({ error: 'That already exists.' })
  if ((err as { type?: string }).type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' })
  if ((err as { type?: string }).type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong.' })
}
