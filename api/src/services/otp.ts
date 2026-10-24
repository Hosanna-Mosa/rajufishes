import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { Customer, OtpCode } from '../models/Customer.js'
import { HttpError } from '../lib/errors.js'
import { sendOtpSms } from './sms.js'

export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_MAX_SENDS_PER_WINDOW = 3
const WINDOW_MS = 10 * 60 * 1000

const hash = (phone: string, code: string) => crypto.createHmac('sha256', env.CUSTOMER_JWT_SECRET).update(`${phone}:${code}`).digest('hex')
const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function sendOtp(phone: string, now = new Date()) {
  const recent = await OtpCode.countDocuments({ phone, createdAt: { $gte: new Date(now.getTime() - WINDOW_MS) } })
  if (recent >= OTP_MAX_SENDS_PER_WINDOW) throw new HttpError(429, 'Too many codes requested. Please wait a few minutes.')
  const code = env.OTP_MODE === 'test' ? env.OTP_TEST_CODE : String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  await sendOtpSms(phone, code)
  await OtpCode.create({ phone, codeHash: hash(phone, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS) })
  return { sent: true as const, expiresInSeconds: OTP_TTL_MS / 1000 }
}

/** Checks the code. Five wrong tries lock that code; a code works once. Returns the customer (created on first sign in). */
export async function verifyOtp(phone: string, code: string, now = new Date()) {
  const rec = await OtpCode.findOne({ phone, usedAt: null, expiresAt: { $gt: now } }).sort({ createdAt: -1 })
  if (!rec) throw new HttpError(400, 'That code has expired. Please send a new one.')
  // count the try first, so parallel guesses cannot beat the limit
  const updated = await OtpCode.findOneAndUpdate({ _id: rec._id, attempts: { $lt: OTP_MAX_ATTEMPTS } }, { $inc: { attempts: 1 } }, { returnDocument: 'after' })
  if (!updated) throw new HttpError(429, 'Too many wrong tries. Please send a new code.')
  if (!safeEqual(updated.codeHash, hash(phone, code))) throw new HttpError(400, 'Wrong code. Please try again.')
  const used = await OtpCode.updateOne({ _id: rec._id, usedAt: null }, { $set: { usedAt: now } })
  if (used.modifiedCount !== 1) throw new HttpError(400, 'That code was already used.')
  return Customer.findOneAndUpdate({ phone }, { $set: { lastLoginAt: now }, $setOnInsert: { phone } }, { upsert: true, returnDocument: 'after' })
}
