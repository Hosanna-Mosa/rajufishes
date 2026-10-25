import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/api'

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/products', '/about', '/contact', '/shipping', '/refunds', '/privacy', '/terms'].map((p) => ({ url: `${site}${p}` }))
  const out: MetadataRoute.Sitemap = [...pages]
  for (let page = 1; page <= 20; page++) {
    const r = await getProducts({ limit: 60, page })
    if (!r) break
    out.push(...r.items.map((p) => ({ url: `${site}/products/${p.slug}` })))
    if (page >= r.pages) break
  }
  return out
}
