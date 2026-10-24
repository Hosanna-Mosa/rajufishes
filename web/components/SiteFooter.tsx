import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer>
      <div className="strip st">
        <div>All-India delivery · Online or cash on delivery · Packed on ice</div>
      </div>
      <div className="ftr">
        <div>
          <span className="big st">Raju Fishes</span>
          <span>Fresh fish from our own boats. Prices on the site are the prices you pay.</span>
          <nav className="st" aria-label="Footer">
            <Link href="/products">All products</Link>
            <Link href="/about">About</Link>
            <Link href="/cart">Cart</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
