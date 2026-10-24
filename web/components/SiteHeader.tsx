import Link from 'next/link'
import { CartLink } from './CartLink'

export function SiteHeader() {
  return (
    <header>
      <div className="topbar" />
      <div className="wrap hdr">
        <Link href="/" className="logo st">Raju Fishes</Link>
        <nav className="nav st" aria-label="Main">
          <Link href="/products?group=Fresh+fish,Prawns+and+crab">Fresh</Link>
          <Link href="/products?group=Dry+fish">Dry</Link>
          <Link href="/products?group=Frozen+packs">Frozen</Link>
          <Link href="/about">About</Link>
          <Link href="/account">Account</Link>
        </nav>
        <CartLink />
      </div>
    </header>
  )
}
