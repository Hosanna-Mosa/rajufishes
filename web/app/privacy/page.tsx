import type { Metadata } from 'next'
import { PolicyPage } from '@/components/PolicyPage'
import { getBusiness } from '@/lib/business'
import { privacyAnalytics } from '@/lib/analyticsCopy'

export const metadata: Metadata = { title: 'Privacy policy', description: 'What personal details we collect when you order, why, and how we look after them.' }

export default async function Privacy() {
  const { b, loginMode } = await getBusiness()
  const otp = loginMode === 'otp'
  const ga = privacyAnalytics(b.name, b.email)
  return (
    <PolicyPage title="Privacy policy" intro="What we collect, why we collect it, and what we do not do.">
      <p className="draft">Draft for {b.name} to read and edit. Last updated: {b.lastUpdated}.</p>
      <h2>Who we are</h2>
      <p>This site is run by {b.name}, {b.address}. You can reach us on {b.phone} or {b.email}.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Your name, mobile number, delivery address and pincode, so we can deliver your order and call you about it.</li>
        <li>Your email address, only if you give it, so we can send an order confirmation.</li>
        <li>What you ordered, the order total and whether it was paid.</li>
        {otp && <li>If you sign in: your mobile number, checked with a one time code sent by SMS.</li>}
      </ul>
      <h2>What we do not collect</h2>
      <p>We never see or store your card, UPI or bank details. Online payments are taken on the page of our payment provider, Razorpay, and we only receive a message saying whether the payment worked.</p>
      <h2>How we use it</h2>
      <p>To pack and deliver your order, to tell you about its status, to give refunds, to answer your questions and to keep our records as the law requires. We do not sell your details and we do not send advertising messages unless you ask for them.</p>
      <h2>Who else sees it</h2>
      <ul>
        <li>The payment provider (Razorpay), to take the payment.</li>
        {otp && <li>The SMS provider (MSG91), to send you the sign in code.</li>}
        <li>The delivery partner ({b.deliveryPartner}), who needs your name, phone and address to deliver.</li>
        <li>Our hosting providers, who store the data for us.</li>
        <li>Authorities, if the law requires it.</li>
      </ul>
      <h2>Cookies</h2>
      <p>We use only the small files needed to {otp ? 'keep you signed in and to ' : ''}remember your cart. We do not use advertising cookies.</p>
      <h2>{ga.title}</h2>
      {ga.paragraphs.map((t) => <p key={t}>{t}</p>)}
      <h2>How long we keep it</h2>
      <p>We keep order records for {b.recordsYears} years for accounts and tax. You can ask us to delete your account and saved addresses at any time. Order records we must keep by law will stay.</p>
      <h2>Your choices</h2>
      <p>You can ask to see, correct or delete your details by calling {b.phone} or writing to {b.email}.</p>
      <h2>Changes</h2>
      <p>If we change this page, the date at the top changes too.</p>
    </PolicyPage>
  )
}
