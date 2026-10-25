import type { Metadata } from 'next'
import { PolicyPage } from '@/components/PolicyPage'
import { getBusiness } from '@/lib/business'

export const metadata: Metadata = { title: 'Cancellation and refund policy', description: 'When you can cancel an order, and when you get a refund for fresh, dry and frozen products.' }

export default async function Refunds() {
  const { b } = await getBusiness()
  return (
    <PolicyPage title="Cancellation and refund policy" intro="Fresh fish spoils quickly, so these rules are different from other shops.">
      <p className="draft">Draft for {b.name} to read and edit. Check every time and number against what you really do. Last updated: {b.lastUpdated}.</p>
      <h2>Cancelling an order</h2>
      <ul>
        <li>{b.cancellationRule}. Call {b.phone} and give your order number.</li>
        <li>Once fresh fish is cleaned and packed it cannot be cancelled, because it cannot be sold to anyone else.</li>
        <li>Dry and frozen packs can be cancelled until they are handed to the courier.</li>
        <li>We may cancel an order if an item is not available, or if we cannot reach your address. You get a full refund.</li>
      </ul>
      <h2>Returns</h2>
      <p>Fresh, frozen and dry food is perishable, so we do not take it back once delivered. We cannot reuse it safely. This does not affect your right to a refund when something is wrong with the order, below.</p>
      <h2>When you get a refund</h2>
      <ul>
        <li>The fish is spoiled, damaged or not what you ordered.</li>
        <li>The pack is missing or short in weight.</li>
        <li>The order arrived too late to be fresh, or was not delivered.</li>
        <li>You paid but the order could not be placed.</li>
      </ul>
      <p>To ask, contact us within {b.refundWindow} of delivery on {b.phone} or {b.email}. Send your order number and a clear photo of the product and the packing. We may refund all or part of the order, or send a replacement, depending on the problem.</p>
      <h2>When you do not get a refund</h2>
      <p>We cannot refund for a change of mind after packing, for a wrong address or phone number given by you, for orders refused at the door without a reason, or when the fish was spoiled after delivery because it was not stored properly.</p>
      <h2>How refunds are paid</h2>
      <ul>
        <li>Online payments go back to the same account, card or UPI you paid from. It usually takes {b.refundPayoutDays} working days to show up, depending on your bank.</li>
        <li>For cash on delivery orders, we refund by {b.refundByCash} to the account you tell us.</li>
        <li>You will get a message when the refund is sent.</li>
      </ul>
      <h2>Problems with a refund</h2>
      <p>If you have not received your refund in that time, contact us at {b.email} with your order number.</p>
    </PolicyPage>
  )
}
