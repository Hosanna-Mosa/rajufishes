import { Schema, model, type InferSchemaType } from 'mongoose'

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: ['fresh', 'dry', 'frozen'], required: true, index: true },
    // display group: "Fresh fish", "Prawns and crab", "Dry fish", "Frozen packs"
    group: { type: String, required: true, trim: true },
    description: { type: String, default: '', maxlength: 2000 },
    note: { type: String, default: '', maxlength: 120 },
    // kg: price is per kg and the customer picks a weight. pack: one fixed pack, one price.
    unit: { type: String, enum: ['kg', 'pack'], required: true },
    price: { type: Number, required: true, min: 0 }, // paise, per kg or per pack
    packWeightG: { type: Number, min: 1 },
    cuts: [{ _id: false, name: { type: String, required: true }, priceDeltaPerKg: { type: Number, default: 0 } }],
    weights: [{ type: Number, min: 1 }], // grams, for unit=kg
    stock: { type: Number, default: 0, min: 0 }, // kg when unit=kg, packs when unit=pack
    trackStock: { type: Boolean, default: true },
    images: [{ _id: false, url: String, publicId: String, alt: String }],
    landedAt: { type: Date },
    marketListed: { type: Boolean, default: false },
    marketOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

// common shop queries: category lists sorted by landed time, and the market board
productSchema.index({ active: 1, category: 1, landedAt: -1 })
productSchema.index({ active: 1, group: 1 })
productSchema.index({ active: 1, marketListed: 1, marketOrder: 1 })

export type ProductDoc = InferSchemaType<typeof productSchema>
export const Product = model('Product', productSchema)
