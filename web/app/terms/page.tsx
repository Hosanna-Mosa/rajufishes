import type { Metadata } from 'next'
import { PolicyPage, businessFill } from '@/components/PolicyPage'

export const metadata: Metadata = { title: 'Terms and conditions', description: 'The rules for ordering from Raju Fishes: prices, payment, delivery and cancellations.' }

export default async function Terms() {
  const { fill } = await businessFill()
  return (
    <PolicyPage title="Terms and conditions" intro="The simple rules for ordering from us.">
      <p className="draft">Draft for [BUSINESS NAME] to read and edit. Last updated: [DATE].</p>
      <h2 className="st">About these terms</h2>
      <p>By placing an order on this site you agree to these terms. The seller is {fill.name}, {fill.address}. Food licence (FSSAI) number: [FSSAI NUMBER].</p>
      <h2 className="st">Prices</h2>
      <p>Prices are in Indian rupees and include [TAX NOTE, for example &quot;all taxes&quot;]. Fresh fish prices follow the daily market board and can change from day to day. The price you see when you pay is the price you are charged. Delivery charges are shown before you pay.</p>
      <h2 className="st">Weight and cutting</h2>
      <p>Fresh fish is sold by weight. Whole fish vary in size, so the packed weight can differ a little from what you chose. [WEIGHT RULE, for example &quot;within 5 percent, and you pay for the weight sent&quot;].</p>
      <h2 className="st">Orders and stock</h2>
      <p>We hold the items in your cart while you pay online, for up to 30 minutes. If the payment does not finish, the order is cancelled and the stock goes back. If an item is not available after you order, we will tell you and refund it.</p>
      <h2 className="st">Payment</h2>
      <p>You can pay online (UPI, cards, net banking) through Razorpay, or pay cash on delivery where it is offered. Cash on delivery may have a limit on the order total.</p>
      <h2 className="st">Delivery, cancellation and refunds</h2>
      <p>These are explained on the <a href="/shipping">Shipping and delivery</a> and <a href="/refunds">Cancellation and refund</a> pages, which are part of these terms.</p>
      <h2 className="st">Your account</h2>
      <p>You sign in with your mobile number. Please keep your phone safe. You are responsible for what is ordered from your account.</p>
      <h2 className="st">Using the site</h2>
      <p>Please do not misuse the site, try to break into it, or place false orders. We may cancel orders that look false.</p>
      <h2 className="st">Our responsibility</h2>
      <p>We take care to pack fish fresh and on ice. Our responsibility for any order is limited to the amount you paid for it, as far as the law allows. Nothing here takes away your rights under the law.</p>
      <h2 className="st">Disputes</h2>
      <p>These terms follow the laws of India. Courts at [CITY, STATE] will handle any dispute. Please contact us first on {fill.phone} or {fill.email} and we will try to sort it out.</p>
    </PolicyPage>
  )
}
