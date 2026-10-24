import type { Product } from './api'

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export const weightLabel = (g: number) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`)

export const CATEGORY_LABEL = { fresh: 'Fresh', dry: 'Dry', frozen: 'Frozen' } as const

/** Price tag text: per kg for fresh, per pack for dry and frozen, following the product's own setting. */
export const priceText = (p: Pick<Product, 'unit' | 'price'>) => (p.unit === 'kg' ? `${rupees(p.price)}/kg` : rupees(p.price))

const IST = 'Asia/Kolkata'
export function landedTime(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}
export function landedIsToday(iso?: string | null) {
  if (!iso) return false
  const day = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: IST })
  return day(new Date(iso)) === day(new Date())
}

/** Same rule as the API's pricing service, so the page and the order agree. Paise. */
export function unitPrice(p: Pick<Product, 'unit' | 'price' | 'packWeightG'>, cutDeltaPerKg: number, weightG: number | null) {
  if (p.unit === 'kg') return Math.round(((p.price + cutDeltaPerKg) * (weightG ?? 1000)) / 1000)
  return p.price + Math.round((cutDeltaPerKg * (p.packWeightG ?? 0)) / 1000)
}
