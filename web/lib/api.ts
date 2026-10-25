export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type Product = {
  _id: string
  name: string
  slug: string
  category: 'fresh' | 'dry' | 'frozen'
  group: string
  note?: string
  description?: string
  unit: 'kg' | 'pack'
  price: number // paise: per kg when unit is kg, per pack when unit is pack
  packWeightG?: number
  cuts: { name: string; priceDeltaPerKg: number }[]
  weights: number[]
  images: { url: string; alt?: string }[]
  landedAt?: string | null
  available: boolean
}

export const GROUPS = ['Fresh fish', 'Prawns and crab', 'Dry fish', 'Frozen packs'] as const
export const SORTS = [
  { value: 'landed', label: 'Landed today first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A to Z' },
] as const

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/api${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null // API not reachable: pages show a friendly message
  }
}

export type ProductList = {
  items: Product[]
  total: number
  page: number
  pages: number
  counts: { group: string; category: string; count: number }[]
}

export const getProducts = (query: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') q.set(k, String(v))
  return get<ProductList>(`/products?${q}`)
}
export const getProduct = (slug: string) => get<{ product: Product; related: Product[] }>(`/products/${encodeURIComponent(slug)}`)
export type Contact = { businessName: string; phone: string; whatsapp: string; email: string; address: string; hours: string }
export const getContact = async () => (await get<{ contact: Contact }>('/meta/contact'))?.contact ?? null
export type Site = { loginMode: 'guest' | 'account' | 'otp'; freeOver: number | null; contact: Contact }
export const getSite = () => get<Site>('/meta/site')
export const getMarket = () => get<{ items: Product[]; updatedAt: string | null }>('/market')
