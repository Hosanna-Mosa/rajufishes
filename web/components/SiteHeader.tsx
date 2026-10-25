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
      <div className="topbar" />
      <p className="utility">{bar}</p>
      <div className="wrap hdr">
        <Link href="/" className="logo st">Raju Fishes</Link>
        {path === '/checkout' ? (
          <Link href="/cart" className="backlink st">← Back to cart</Link>
        ) : path === '/sign-in' ? (
          <Link href="/products" className="backlink st">← Back to the shop</Link>
        ) : (
          <>
            <nav className="nav st" aria-label="Main">
              <Link href="/products?group=Fresh+fish,Prawns+and+crab">Fresh</Link>
              <Link href="/products?group=Dry+fish">Dry</Link>
              <Link href="/products?group=Frozen+packs">Frozen</Link>
              <Link href="/about">About</Link>
              {otp && <Link href="/account" className={path.startsWith('/account') ? 'on' : undefined}>Account</Link>}
            </nav>
            <CartLink on={path === '/cart'} />
          </>
        )}
      </div>
    </header>
  )
}
