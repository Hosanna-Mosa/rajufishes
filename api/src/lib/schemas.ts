import { z } from 'zod'
import mongoose from 'mongoose'
import { normalizePhone } from './phone.js'
import { INDIA_STATES } from '../data/states.js'

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v) && String(new mongoose.Types.ObjectId(v)) === v, 'Invalid id')
export const phoneField = z.string().trim().max(20).transform((v, ctx) => {
  const p = normalizePhone(v)
  if (!p) ctx.addIssue({ code: 'custom', message: 'Enter a 10 digit mobile number' })
  return p ?? ''
})
export const pincode = z.string().regex(/^[1-9]\d{5}$/, 'Pincode must be 6 digits')
export const rupeesPaise = z.number().int().min(0).max(100_000_000)
const text = (max: number) => z.string().trim().max(max)

export const cartItem = z.object({
  productId: objectId,
  cut: text(40).nullish(),
  weightG: z.number().int().min(1).max(100_000).nullish(),
  qty: z.number().int().min(1).max(50),
}).strict()

export const addressBody = z.object({
  label: text(30).optional(),
  name: text(80).min(1),
  phone: phoneField,
  line1: text(160).min(1),
  line2: text(160).optional(),
  city: text(80).min(1),
  state: z.enum(INDIA_STATES),
  pincode,
}).strict()
