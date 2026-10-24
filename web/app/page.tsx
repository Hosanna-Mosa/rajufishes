import { getProducts, rupees, type Product } from '@/lib/api'

const GROUPS = ['Fresh fish', 'Prawns and crab', 'Dry fish', 'Frozen packs']

function Card({ p }: { p: Product }) {
  const img = p.images?.[0]
  const sold = p.stock <= 0
  return (
    <article className={`card ${p.category}`}>
      <div className="pic">{img ? <img src={img.url} alt={img.alt ?? p.name} /> : <span>{p.name.split(' ')[0]}</span>}</div>
      <div className="info">
        <h3>{p.name}</h3>
        {p.note && <div className="note">{p.note}</div>}
        <div className="price">
          {rupees(p.price)} <small>{p.unit === 'kg' ? 'per kg' : p.packWeightG ? `per ${p.packWeightG} g pack` : 'per pack'}</small>
        </div>
        {sold && <div className="sold">Sold out today</div>}
      </div>
    </article>
  )
}

export default async function Home() {
  const products = await getProducts()
  return (
    <>
      <header className="top">
        <span className="logo">Raju Fishes</span>
        <span className="pennant">Landed today</span>
      </header>
      <section className="hero">
        <h1>From our boats to your door</h1>
        <p>Fresh, dry and frozen fish from our own family boats.</p>
      </section>
      <main>
        {products === null ? (
          <div className="empty">
            <h3>Shop not reachable</h3>
            <p>The shop could not load the fish list. Start the API with <code>npm run dev</code> and refresh.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty">
            <h3>No fish yet</h3>
            <p>Run <code>npm run seed</code> to add the sample fish.</p>
          </div>
        ) : (
          GROUPS.map((g) => {
            const items = products.filter((p) => p.group === g)
            return items.length ? (
              <section className="section" key={g}>
                <h2>{g}</h2>
                <div className="grid">{items.map((p) => <Card key={p._id} p={p} />)}</div>
              </section>
            ) : null
          })
        )}
      </main>
      <footer>Raju Fishes. Sample prices for now.</footer>
    </>
  )
}
