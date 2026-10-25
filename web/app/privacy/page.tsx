import type { Metadata } from 'next'
import { PolicyPage, businessFill } from '@/components/PolicyPage'

export const metadata: Metadata = { title: 'Privacy policy', description: 'What personal details we collect when you order, why, and how we look after them.' }

export default async function Privacy() {
  const { fill } = await businessFill()
  return (
    <PolicyPage title="Privacy policy" intro="What we collect, why we collect it, and what we do not do.">
      <p className="draft">Draft for [BUSINESS NAME] to read and edit. Last updated: [DATE].</p>
      <h2 className="st">Who we are</h2>
      <p>This site is run by {fill.name}, {fill.address}. You can reach us on {fill.phone} or {fill.email}.</p>
      <h2 className="st">What we collect</h2>
      <ul>
        <li>Your name, mobile number, delivery address and pincode, so we can deliver your order and call you about it.</li>
        <li>Your email address, only if you give it, so we can send an order confirmation.</li>
        <li>What you ordered, the order total and whether it was paid.</li>
        <li>If you sign in: your mobile number, checked with a one time code sent by SMS.</li>
      </ul>
      <h2 className="st">What we do not collect</h2>
      <p>We never see or store your card, UPI or bank details. Online payments are taken on the page of our payment provider, Razorpay, and we only receive a message saying whether the payment worked.</p>
      <h2 className="st">How we use it</h2>
      <p>To pack and deliver your order, to tell you about its status, to give refunds, to answer your questions and to keep our records as the law requires. We do not sell your details and we do not send advertising messages unless you ask for them.</p>
      <h2 className="st">Who else sees it</h2>
      <ul>
        <li>The payment provider (Razorpay), to take the payment.</li>
        <li>The SMS provider ([SMS PROVIDER NAME]), to send you the sign in code.</li>
        <li>The delivery partner ([DELIVERY PARTNER NAME]), who needs your name, phone and address to deliver.</li>
        <li>Our hosting providers, who store the data for us.</li>
        <li>Authorities, if the law requires it.</li>
      </ul>
      <h2 className="st">Cookies</h2>
      <p>We use only the small files needed to keep you signed in and to remember your cart. We do not use advertising cookies.</p>
      <h2 className="st">How long we keep it</h2>
      <p>We keep order records for [NUMBER] years for accounts and tax. You can ask us to delete your account and saved addresses at any time. Order records we must keep by law will stay.</p>
      <h2 className="st">Your choices</h2>
      <p>You can ask to see, correct or delete your details by calling {fill.phone} or writing to {fill.email}.</p>
      <h2 className="st">Changes</h2>
      <p>If we change this page, the date at the top changes too.</p>
    </PolicyPage>
  )
}
