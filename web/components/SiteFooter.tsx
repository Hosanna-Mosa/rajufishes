import Link from 'next/link'
import type { Resolved } from '@/lib/business'

export function SiteFooter({ biz }: { biz: Resolved }) {
  const { b } = biz
  return (
    <footer>
      <div className="strip st">
        <div>All-India delivery · Online or cash on delivery · Free delivery over {b.freeOver}</div>
      </div>
      <div className="ftr">
        <div>
          <span className="big st">{b.name}</span>
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
          <span className="reach">{b.phone} · {b.email}</span>
          <span className="reach">{b.address}</span>
          <span className="reach">FSSAI {b.fssai} · GST {b.gst}</span>
        </div>
      </div>
    </footer>
  )
}
