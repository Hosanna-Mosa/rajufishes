'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CartLink } from './CartLink'
import { useSite } from './SiteContext'

/** The full header, a plain one for checkout (logo and a way back) and one for sign in. */
export function SiteHeader({ bar }: { bar: string }) {
  const path = usePathname()
  const otp = useSite().loginMode === 'otp'
  return (
    <header>
      <p className="utility">{bar}</p>
      <div className="wrap hdr">
        {path === '/checkout' ? (
          <>
            <Link href="/cart" className="backlink">← Back to cart</Link>
            <Link href="/" className="logo">Raju Fishes</Link>
            <span />
          </>
        ) : path === '/sign-in' ? (
          <>
            <Link href="/products" className="backlink">← Back to the shop</Link>
            <Link href="/" className="logo">Raju Fishes</Link>
            <span />
          </>
        ) : (
          <>
            <nav className="nav" aria-label="Main">
              <Link href="/products?group=Fresh+fish,Prawns+and+crab">Fresh</Link>
              <Link href="/products?group=Dry+fish">Dry</Link>
              <Link href="/products?group=Frozen+packs">Frozen</Link>
              <Link href="/about">About</Link>
            </nav>
            <Link href="/" className="logo">Raju Fishes</Link>
            <div className="nav right">
              <Link href="/products">Search</Link>
              {otp && <Link href="/account" className={path.startsWith('/account') ? 'on' : undefined}>Account</Link>}
              <CartLink on={path === '/cart'} />
            </div>
          </>
        )}
      </div>
    </header>
  )
}
