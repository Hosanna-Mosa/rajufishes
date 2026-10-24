import Link from 'next/link'
import type { Metadata } from 'next'
import { getProducts } from '@/lib/api'
import { MarketPanel } from '@/components/MarketPanel'
import { ProductCard } from '@/components/ProductCard'

export const metadata: Metadata = {
  title: { absolute: 'Raju Fishes: fresh off the boat' },
  description: "Fresh fish landed by our own boats this morning, plus dry and frozen packs. Today's market prices, delivered all over India.",
}

export default async function Home() {
  const data = await getProducts({ limit: 8 })
  return (
    <main>
      <section className="hero">
        <div className="hero-l">
          <span className="kick st">Boat 02 · Family fleet</span>
          <h1 className="st">Fresh<br />off the<br />boat.</h1>
          <p>We land it, clean it, ice it and send it. Dry and frozen packs go all over India.</p>
          <Link href="/products" className="cta st">Shop today&apos;s catch</Link>
          <div className="grow" />
          <div className="sw" />
          <div className="sr" />
        </div>
        <div className="hero-r">
          <MarketPanel />
        </div>
      </section>

      <section className="wrap sec" id="catch">
        <div className="sec-h">
          <h2 className="st">Everything we sell</h2>
          <Link href="/products" className="st" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '.06em' }}>See all products →</Link>
        </div>
        {data ? (
          <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} imgHeight={140} />)}</div>
        ) : (
          <p className="empty">We cannot load the catalogue right now. Please refresh in a minute.</p>
        )}
        {data && data.total > 8 && (
          <div className="more"><Link href="/products" className="btn yellow big st" style={{ padding: '0 32px' }}>See all {data.total} products</Link></div>
        )}
      </section>
    </main>
  )
}
