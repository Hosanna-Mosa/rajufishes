import type { Metadata } from 'next'
import { CartCount, CartView } from '@/components/CartView'
import { Stripes } from '@/components/Stripes'

export const metadata: Metadata = { title: 'Your cart' }

export default function CartPage() {
  return (
    <main>
      <div className="banner">
        <div className="wrap">
          <h1 className="st" style={{ paddingTop: 32 }}>Your cart</h1>
          <CartCount />
        </div>
        <Stripes />
      </div>
      <CartView />
    </main>
  )
}
