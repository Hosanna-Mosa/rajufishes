import { Schema, model } from 'mongoose'

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true, min: 0 }, // percent, or paise for flat
    maxDiscount: { type: Number, default: 0 }, // paise, 0 = no cap
    minSubtotal: { type: Number, default: 0 },
    startsAt: Date,
    endsAt: Date,
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    perCustomerLimit: { type: Number, default: 1 }, // 0 = unlimited
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)
export const Coupon = model('Coupon', couponSchema)
