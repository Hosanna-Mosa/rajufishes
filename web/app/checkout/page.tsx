import type { Metadata } from 'next'
import { CheckoutView } from '@/components/CheckoutView'

export const metadata: Metadata = { title: 'Checkout' }

export default function CheckoutPage() {
  return (
    <main>
      <div className="wrap">
        <div className="banner">
          <div className="steps"><span>1 Cart</span><span className="on">2 Details</span><span>3 Payment</span></div>
          <h1>Checkout</h1>
        </div>
      </div>
      <CheckoutView />
    </main>
  )
}
