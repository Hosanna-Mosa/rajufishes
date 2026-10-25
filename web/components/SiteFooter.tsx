import Link from 'next/link'
import type { Resolved } from '@/lib/business'

export function SiteFooter({ biz }: { biz: Resolved }) {
  const { b } = biz
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-top">
          <span className="big">{b.name}</span>
          <div className="ftr-cols">
            <nav aria-label="Shop">
              <Link href="/products?group=Fresh+fish,Prawns+and+crab">Fresh</Link>
              <Link href="/products?group=Dry+fish">Dry</Link>
              <Link href="/products?group=Frozen+packs">Frozen</Link>
              <Link href="/track">Track order</Link>
            </nav>
            <nav aria-label="Company">
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/shipping">Shipping</Link>
              <Link href="/cart">Cart</Link>
            </nav>
            <nav aria-label="Policies">
              <Link href="/refunds">Refunds</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
        </div>
        <p className="reach">All-India delivery · Online or cash on delivery · Free delivery over {b.freeOver}</p>
        <p className="reach">{b.phone} · {b.email} · {b.address}</p>
        <p className="reach">FSSAI {b.fssai} · GST {b.gst}</p>
      </div>
    </footer>
  )
}
