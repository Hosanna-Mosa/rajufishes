import { Schema, model } from 'mongoose'
import { addressFields } from './Address.js'

export const ORDER_STATUSES = ['placed', 'packed', 'shipped', 'delivered', 'cancelled'] as const
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'cod_due', 'cod_collected'] as const

const itemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    slug: String,
    image: String,
    category: String,
    unit: String,
    cut: { type: String, default: null },
    weightG: { type: Number, default: null }, // kg items: weight chosen. pack items: pack weight.
    qty: { type: Number, required: true },
    unitPrice: Number, // paise
    lineTotal: Number, // paise
    stockUse: { type: Number, default: 0 }, // kg or packs taken from stock (0 if not tracked)
  },
  { _id: false },
)

const orderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true, default: null },
    guestPhone: { type: String, default: null },
    contact: { name: String, phone: String, email: { type: String, default: '' } },
    shippingAddress: addressFields,
    zoneId: Schema.Types.ObjectId,
    zoneName: String,
    deliverySlot: String,
    items: { type: [itemSchema], required: true },
    subtotal: Number,
    deliveryCharge: Number,
    discount: { type: Number, default: 0 },
    total: Number,
    couponCode: { type: String, default: null },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
    statusHistory: [{ _id: false, status: String, at: Date, by: String, note: String }],
    payment: {
      method: { type: String, enum: ['razorpay', 'cod'], required: true },
      status: { type: String, enum: PAYMENT_STATUSES, required: true },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
      refundId: String,
    },
    // stock: held (online, waiting for payment) -> committed (paid / COD), or released (cancel / expiry)
    stockState: { type: String, enum: ['held', 'committed', 'released'], default: 'committed' },
    holdExpiresAt: { type: Date, default: null, index: true },
    trackingNote: { type: String, default: '' },
    adminNote: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true },
)
export const Order = model('Order', orderSchema)
