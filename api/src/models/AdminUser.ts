import { Schema, model } from 'mongoose'

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'staff'], default: 'staff' },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
)
export const AdminUser = model('AdminUser', adminSchema)
