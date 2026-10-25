import type { Metadata } from 'next'
import { PolicyPage, businessFill } from '@/components/PolicyPage'

export const metadata: Metadata = { title: 'Contact us', description: 'Phone, email and the address of our stall. Call or message us about an order.' }

export default async function Contact() {
  const { fill, contact } = await businessFill()
  const wa = contact?.whatsapp?.replace(/\D/g, '')
  return (
    <PolicyPage title="Contact us" intro="Questions about an order? Call or message us.">
      <h2 className="st">{fill.name}</h2>
      <dl className="contact">
        <div><dt className="st">Phone</dt><dd><a href={`tel:${fill.phone.replace(/[^\d+]/g, '')}`}>{fill.phone}</a></dd></div>
        {wa && <div><dt className="st">WhatsApp</dt><dd><a href={`https://wa.me/${wa}`}>{contact?.whatsapp}</a></dd></div>}
        <div><dt className="st">Email</dt><dd><a href={`mailto:${fill.email}`}>{fill.email}</a></dd></div>
        <div><dt className="st">Stall address</dt><dd>{fill.address}</dd></div>
        <div><dt className="st">Hours</dt><dd>{contact?.hours || '[OPENING HOURS]'}</dd></div>
      </dl>
      <p>When you write about an order, please tell us the order number (for example #0421) so we can find it quickly. We reply within [REPLY TIME, for example one working day].</p>
    </PolicyPage>
  )
}
