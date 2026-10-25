import Link from 'next/link'
import type { Contact } from '@/lib/api'

export function SiteFooter({ c }: { c: Contact | null }) {
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
            <Link href="/track">Track order</Link>
          </nav>
          <nav className="legal" aria-label="Policies">
            <Link href="/contact">Contact us</Link>
            <Link href="/shipping">Shipping and delivery</Link>
            <Link href="/refunds">Cancellation and refunds</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms and conditions</Link>
          </nav>
          {(c?.phone || c?.email) && <span className="reach">{[c.phone, c.email].filter(Boolean).join(' · ')}</span>}
        </div>
      </div>
    </footer>
  )
}
