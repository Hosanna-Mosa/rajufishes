import type { Product } from './api'
import type { OrderItem, QuoteLine } from './client'
import type { AItem } from './analytics'
import { unitPrice } from './format'

type P = Pick<Product, '_id' | 'name' | 'category' | 'unit' | 'price' | 'packWeightG' | 'weights'>

/** A product as an analytics item, at its default weight (1 kg, or the pack). */
export function productItem(p: P, over: { cutDelta?: number; weightG?: number | null; qty?: number } = {}): AItem {
  const weightG = over.weightG !== undefined ? over.weightG : p.unit === 'kg' ? (p.weights.includes(1000) ? 1000 : p.weights[0] ?? 1000) : null
  return { id: p._id, name: p.name, category: p.category, pricePaise: unitPrice(p, over.cutDelta ?? 0, weightG), qty: over.qty ?? 1 }
}
export const quoteItem = (l: QuoteLine): AItem => ({ id: l.productId, name: l.name, category: l.category, pricePaise: l.unitPrice, qty: l.qty })
export const orderItem = (l: OrderItem): AItem => ({ id: l.productId ?? l.slug, name: l.name, category: l.category, pricePaise: l.unitPrice, qty: l.qty })
