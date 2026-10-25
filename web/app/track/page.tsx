import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TrackForm } from '@/components/TrackForm'

export const metadata: Metadata = { title: 'Track your order' }

/** Old style link (?orderNo=&token=) lands on the order page. Otherwise: look an order up with its number and phone. */
export default async function Track({ searchParams }: { searchParams: Promise<{ orderNo?: string; token?: string }> }) {
  const { orderNo, token } = await searchParams
  if (orderNo && /^\d{3,10}$/.test(orderNo)) redirect(`/orders/${orderNo}${token ? `?token=${encodeURIComponent(token)}` : ''}`)
  return (
    <main>
      <div className="wrap trackpage">
        <h1 className="st">Track your order</h1>
        <p>Type the order number from your confirmation page and the phone number you gave when you ordered. You can also open the private tracking link you were shown after ordering.</p>
        <TrackForm />
      </div>
    </main>
  )
}
