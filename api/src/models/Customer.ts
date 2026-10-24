import { Schema, model } from 'mongoose'

const customerSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, default: '', trim: true, maxlength: 80 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 120 },
    defaultAddressId: { type: Schema.Types.ObjectId },
    lastLoginAt: Date,
  },
  { timestamps: true },
)
export const Customer = model('Customer', customerSchema)

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
