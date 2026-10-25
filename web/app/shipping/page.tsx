import type { Metadata } from 'next'
import { PolicyPage, businessFill } from '@/components/PolicyPage'

export const metadata: Metadata = { title: 'Shipping and delivery', description: 'Where we deliver, cut-off times for fresh fish, delivery charges and what happens if there is a delay.' }

export default async function Shipping() {
  const { fill } = await businessFill()
  return (
    <PolicyPage title="Shipping and delivery" intro="Where we deliver, when, and what a delay means.">
      <p className="draft">Draft for [BUSINESS NAME] to read and edit. Check every time and number against what you really do. Last updated: [DATE].</p>
      <h2 className="st">Where we deliver</h2>
      <p>Dry and frozen packs go all over India. Fresh fish is delivered only to the areas listed here: [FRESH FISH DELIVERY AREAS, for example &quot;pincodes 5xxxxx to 5xxxxx&quot;]. Type your pincode on the product page or at checkout to check. If we cannot deliver fresh fish to you, we say so before you pay.</p>
      <h2 className="st">Fresh fish: order cut-off and delivery time</h2>
      <ul>
        <li>Orders for fresh fish placed before [CUT-OFF TIME, for example 10 am] are packed and sent the same day.</li>
        <li>Orders after that are packed the next morning from the next catch.</li>
        <li>Delivery slots: [DELIVERY SLOTS, for example &quot;7 to 10 am, 4 to 7 pm&quot;].</li>
        <li>We do not deliver fresh fish on [DAYS CLOSED, for example the days the boats do not go out].</li>
      </ul>
      <h2 className="st">Dry and frozen packs</h2>
      <p>Packed within [NUMBER] working days and delivered in [NUMBER] to [NUMBER] days, depending on where you live. Frozen packs travel in an insulated box with ice.</p>
      <h2 className="st">Delivery charges</h2>
      <p>The charge depends on your area and is shown before you pay. Many areas get free delivery above a set order value, which is shown at checkout.</p>
      <h2 className="st">Delays</h2>
      <p>Weather, sea conditions, strikes, road closures and courier delays can make a delivery late. If a fresh order will be late, we will call or message you. If it cannot reach you fresh, we will cancel it and refund the full amount, as explained on the <a href="/refunds">Cancellation and refund</a> page.</p>
      <h2 className="st">When your parcel arrives</h2>
      <p>Please be available to receive it, because fresh fish should not wait outside. Open it and check it at once. If something is wrong, take a photo and contact us within [HOURS, for example 2 hours] on {fill.phone} or {fill.email}.</p>
      <h2 className="st">Tracking</h2>
      <p>Use the Track order page with your order number and phone number to see packed, shipped and delivered.</p>
    </PolicyPage>
  )
}
