import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProduct } from '@/lib/api'
import { CATEGORY_LABEL, landedIsToday, landedTime, priceText, weightLabel } from '@/lib/format'
import { Gallery } from '@/components/Gallery'
import { ProductBuy } from '@/components/ProductBuy'
import { ProductImage } from '@/components/ProductImage'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getProduct(slug)
  if (!data) return { title: 'Product not found' }
  const p = data.product
  return {
    title: p.name,
    description: p.description?.slice(0, 160) || `${p.name} from Raju Fishes. ${priceText(p)}, delivered all over India.`,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, images: p.images?.[0]?.url ? [{ url: p.images[0].url }] : undefined },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const data = await getProduct(slug)
  if (!data) notFound()
  const { product: p, related } = data
  const time = landedTime(p.landedAt)
  const kicker =
    p.category === 'fresh'
      ? `Fresh${landedIsToday(p.landedAt) && time ? ` · landed today ${time}` : ''}`
      : `${CATEGORY_LABEL[p.category]}${p.packWeightG ? ` · ${weightLabel(p.packWeightG)} pack` : ''}`

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || `${p.name} from Raju Fishes`,
    image: p.images?.map((i) => i.url),
    brand: { '@type': 'Brand', name: 'Raju Fishes' },
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: (p.price / 100).toFixed(2), availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/products/${p.slug}` },
  }
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <div className="wrap crumbs">
        <Link href="/">Home</Link> / <Link href="/products">All products</Link> / {p.name}
      </div>
      <div className="wrap pdp">
        <Gallery product={p} />
        <div className="info">
          <span className="kick st">{kicker}</span>
          <h1 className="st">{p.name}</h1>
          <ProductBuy product={p} />
        </div>
      </div>

      <div className="wrap facts">
        <div>
          <div className="h st">Freshness</div>
          <div className="b">Landed at first light, cleaned and packed on ice the same morning.</div>
        </div>
        <div>
          <div className="h st">Storage</div>
          <div className="b">Keep in the fridge and cook within 2 days, or freeze it right away.</div>
        </div>
        <div>
          <div className="h st">Delivery</div>
          <div className="b">Packed in an insulated box with ice. Track your order from packed to delivered.</div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="wrap also">
          <h2 className="st">You may also like</h2>
          <div className="grid">
            {related.map((r) => (
              <Link key={r._id} href={`/products/${r.slug}`} className="card">
                <div className={`card-top ${r.category}`}>
                  <ProductImage product={r} height={110} />
                </div>
                <div className="row">
                  <span className="nm st">{r.name}</span>
                  <span className="p st">{priceText(r)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
