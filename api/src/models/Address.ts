import { Schema, model } from 'mongoose'

export const addressFields = {
  label: { type: String, default: 'Home', trim: true, maxlength: 30 },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, required: true },
  line1: { type: String, required: true, trim: true, maxlength: 160 },
  line2: { type: String, default: '', trim: true, maxlength: 160 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, match: /^\d{6}$/ },
}

const addressSchema = new Schema(
  { customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true }, ...addressFields, isDefault: { type: Boolean, default: false } },
  { timestamps: true },
)
export const Address = model('Address', addressSchema)
