import type { Metadata } from 'next'
import { CheckoutView } from '@/components/CheckoutView'
import { Stripes } from '@/components/Stripes'

export const metadata: Metadata = { title: 'Checkout' }

export default function CheckoutPage() {
  return (
    <main>
      <div className="banner">
        <div className="wrap">
          <h1 className="st" style={{ paddingTop: 28 }}>Checkout</h1>
          <div className="steps st"><span className="on">1 Your details</span><span>2 Delivery</span><span>3 Payment</span></div>
        </div>
        <Stripes />
      </div>
      <CheckoutView />
    </main>
  )
}
