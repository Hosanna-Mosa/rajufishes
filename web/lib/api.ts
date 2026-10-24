const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type Product = {
  _id: string
  name: string
  slug: string
  category: 'fresh' | 'dry' | 'frozen'
  group: string
  note?: string
  unit: 'kg' | 'pack'
  price: number // paise
  packWeightG?: number
  stock: number
  images?: { url: string; alt?: string }[]
}

/** Returns null when the API cannot be reached, so the page can say so instead of crashing. */
export async function getProducts(): Promise<Product[] | null> {
  try {
    const res = await fetch(`${API}/api/products?limit=60`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.items ?? []
  } catch {
    return null
  }
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`
