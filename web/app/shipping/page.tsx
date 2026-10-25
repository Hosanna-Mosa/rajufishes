import type { Metadata } from 'next'
import { PolicyPage } from '@/components/PolicyPage'
import { getBusiness } from '@/lib/business'

export const metadata: Metadata = { title: 'Shipping and delivery', description: 'Where we deliver, cut-off times for fresh fish, delivery charges and what happens if there is a delay.' }

export default async function Shipping() {
  const { b } = await getBusiness()
  return (
    <PolicyPage title="Shipping and delivery" intro="Where we deliver, when, and what a delay means.">
      <p className="draft">Draft for {b.name} to read and edit. Check every time and number against what you really do. Last updated: {b.lastUpdated}.</p>
      <h2>Where we deliver</h2>
      <p>Dry and frozen packs go all over India. Delivery areas: {b.deliveryZones}. Fresh fish is delivered only to the areas listed here. Type your pincode on the product page or at checkout to check. If we cannot deliver fresh fish to you, we say so before you pay.</p>
      <h2>Fresh fish: order cut-off and delivery time</h2>
      <ul>
        <li>Orders for fresh fish placed before {b.freshCutoff} are packed and sent the same day.</li>
        <li>Orders after that are packed the next morning from the next catch.</li>
        <li>Delivery slots: {b.deliverySlots}.</li>
        <li>Cold chain: {b.coldChain}.</li>
        <li>We do not deliver fresh fish on {b.daysClosed}.</li>
      </ul>
      <h2>Dry and frozen packs</h2>
      <p>Packed within {b.dryDispatchDays} working days and delivered in {b.dryDeliveryDays} days, depending on where you live. Frozen packs travel in an insulated box with ice.</p>
      <h2>Delivery charges</h2>
      <p>The charge depends on your area and is shown before you pay. Delivery is free for orders over {b.freeOver} in the areas where free delivery applies, and the exact charge is shown at checkout.</p>
      <h2>Delays</h2>
      <p>Weather, sea conditions, strikes, road closures and courier delays can make a delivery late. If a fresh order will be late, we will call or message you. If it cannot reach you fresh, we will cancel it and refund the full amount, as explained on the <a href="/refunds">Cancellation and refund</a> page.</p>
      <h2>When your parcel arrives</h2>
      <p>Please be available to receive it, because fresh fish should not wait outside. Open it and check it at once. If something is wrong, take a photo and contact us within {b.refundWindow} on {b.phone} or {b.email}.</p>
      <h2>Tracking</h2>
      <p>Use the <a href="/track">Track order</a> page with your order number and phone number, or the private tracking link from your order page, to see packed, shipped and delivered.</p>
    </PolicyPage>
  )
}
