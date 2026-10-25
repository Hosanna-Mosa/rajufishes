import Link from 'next/link'
import type { Metadata } from 'next'
import { getProducts } from '@/lib/api'
import { FishIcon } from '@/components/KindIcons'
import { ProductCard } from '@/components/ProductCard'
import { Tabs } from '@/components/Tabs'

export const metadata: Metadata = {
  title: { absolute: 'Raju Fishes: fresh off the boat' },
  description: "Fresh fish landed by our own boats this morning, plus dry and frozen packs. Today's market prices, delivered all over India.",
}

const KINDS = [
  { name: 'Seer', group: 'Fresh+fish' },
  { name: 'Pomfret', group: 'Fresh+fish' },
  { name: 'Prawns', group: 'Prawns+and+crab' },
  { name: 'Crab', group: 'Prawns+and+crab' },
  { name: 'Anchovy', group: 'Dry+fish' },
  { name: 'Squid', group: 'Frozen+packs' },
] as const
const ICON = { Seer: undefined, Pomfret: 'slim', Prawns: 'whiskers', Crab: 'claws', Anchovy: 'slim', Squid: 'tentacles' } as const

const PROMISES = [
  ['Landed today', 'Our boats land before sunrise, and we pack the same morning.'],
  ['Kept cold', 'Sealed insulated box with ice from our door to yours.'],
  ['Track it', 'Follow your order from packed to delivered, no account needed.'],
]

export default async function Home() {
  const data = await getProducts({ limit: 8 })
  return (
    <main>
      <div className="wrap">
        <section className="hero">
          <h1>Fresh fish,<br />delivered cold.</h1>
          <div className="hero-r">
            <p>Landed by our own boats at first light, then cleaned, packed on ice and sent to your door.</p>
            <Link href="/products" className="btn">Shop the catch</Link>
          </div>
        </section>

        <section id="catch" aria-label="The catch">
          <Tabs
            items={[
              { label: 'All', href: '/products', on: true },
              { label: 'Fresh', href: '/products?group=Fresh+fish,Prawns+and+crab', on: false },
              { label: 'Dry', href: '/products?group=Dry+fish', on: false },
              { label: 'Frozen', href: '/products?group=Frozen+packs', on: false },
            ]}
            note={data ? `${data.total} products` : undefined}
          />
          {data ? (
            <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
          ) : (
            <p className="empty">We cannot load the catalogue right now. <Link href="/">Refresh</Link></p>
          )}
          {data && data.total > 8 && (
            <div className="more"><Link href="/products" className="textlink">See all {data.total} products</Link></div>
          )}
        </section>

        <section className="sec" aria-labelledby="kinds">
          <div className="sec-h"><h2 id="kinds">Browse by kind</h2><span>Fresh, dry and frozen</span></div>
          <div className="kinds">
            {KINDS.map((k) => (
              <Link key={k.name} href={`/products?group=${k.group}`} className="kindbox">
                <FishIcon extra={ICON[k.name]} />
                <span>{k.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="promise" aria-label="Our promise">
          {PROMISES.map(([t, d]) => (
            <div key={t}><h3>{t}</h3><p>{d}</p></div>
          ))}
        </section>
      </div>
    </main>
  )
}
