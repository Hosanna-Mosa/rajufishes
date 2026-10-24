import { Schema, model } from 'mongoose'

const zoneSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    match: {
      pincodes: { type: [String], default: [] },
      pincodePrefixes: { type: [String], default: [] }, // 3 to 5 digit prefixes
      states: { type: [String], default: [] },
    },
    isDefault: { type: Boolean, default: false },
    charge: { type: Number, default: 6000, min: 0 }, // paise, sample
    freeOver: { type: Number, default: 99900, min: 0 }, // paise, sample
    minOrder: { type: Number, default: 0, min: 0 },
    etaDays: { type: Number, default: 3, min: 0 },
    codAllowed: { type: Boolean, default: true },
    freshAllowed: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)
export const DeliveryZone = model('DeliveryZone', zoneSchema)

const settingsSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    restrictFreshToZones: { type: Boolean, default: false },
    freshOnlyMessage: {
      type: String,
      default: 'Fresh fish is not delivered to this pincode. Remove it or choose dry or frozen items.',
    },
    codMaxTotal: { type: Number, default: 0 }, // paise, 0 = no cap
    holdMinutes: { type: Number, default: 30 },
    deliverySlots: { type: [{ _id: false, id: String, label: String }], default: [
      { id: 'tomorrow_morning', label: 'Tomorrow morning' },
      { id: 'tomorrow_evening', label: 'Tomorrow evening' },
    ] },
    orderCounter: { type: Number, default: 0 },
    stallPhone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
  },
  { timestamps: true },
)
export const Settings = model('Settings', settingsSchema)

export async function getSettings() {
  return Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, returnDocument: 'after' })
}
