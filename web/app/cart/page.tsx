import type { Metadata } from 'next'
import { CartCount, CartView } from '@/components/CartView'

export const metadata: Metadata = { title: 'Your cart' }

export default function CartPage() {
  return (
    <main>
      <div className="wrap">
        <div className="banner">
          <div className="steps"><span className="on">1 Cart</span><span>2 Details</span><span>3 Payment</span></div>
          <h1>Your cart</h1>
          <CartCount />
        </div>
      </div>
      <CartView />
    </main>
  )
}
