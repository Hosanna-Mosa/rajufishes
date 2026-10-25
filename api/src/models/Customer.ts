import { Schema, model } from 'mongoose'

const customerSchema = new Schema(
  {
    phone: { type: String, trim: true, maxlength: 20 }, // optional: email accounts add it later
    name: { type: String, default: '', trim: true, maxlength: 80 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 120 },
    passwordHash: { type: String, select: false }, // bcrypt only, never the password itself
    defaultAddressId: { type: Schema.Types.ObjectId },
    // the saved cart: choices only, never prices
    cart: { type: [{ _id: false, productId: String, slug: String, cut: { type: String, default: null }, weightG: { type: Number, default: null }, qty: Number }], default: [] },
    lastLoginAt: Date,
  },
  { timestamps: true },
)
// unique only when filled in, so phone-only (old) and email-only (new) customers can live side by side
customerSchema.index({ phone: 1 }, { name: 'phone_unique', unique: true, partialFilterExpression: { phone: { $gt: '' } } })
customerSchema.index({ email: 1 }, { name: 'email_unique', unique: true, partialFilterExpression: { email: { $gt: '' } } })
export const Customer = model('Customer', customerSchema)

/** One row per "forgot password" email. Only a hash of the link token is kept; it works once, for 30 minutes. */
const resetSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true },
)
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 })
export const PasswordReset = model('PasswordReset', resetSchema)

const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    usedAt: Date,
  },
  { timestamps: true },
)
// rows disappear on their own one hour after they expire
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 })
export const OtpCode = model('OtpCode', otpSchema)
