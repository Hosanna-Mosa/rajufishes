import type { Metadata } from 'next'
import { PolicyPage } from '@/components/PolicyPage'
import { getBusiness } from '@/lib/business'

export const metadata: Metadata = { title: 'Contact us', description: 'Phone, email and the address of our stall. Call or message us about an order.' }

export default async function Contact() {
  const { b, raw } = await getBusiness()
  const wa = raw.whatsapp.replace(/\D/g, '')
  return (
    <PolicyPage title="Contact us" intro="Questions about an order? Call or message us.">
      <h2 className="st">{b.name}</h2>
      <dl className="contact">
        <div><dt className="st">Phone</dt><dd>{raw.phone ? <a href={`tel:${raw.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a> : b.phone}</dd></div>
        {wa && <div><dt className="st">WhatsApp</dt><dd><a href={`https://wa.me/${wa}`}>{raw.whatsapp}</a></dd></div>}
        <div><dt className="st">Email</dt><dd>{raw.email ? <a href={`mailto:${raw.email}`}>{b.email}</a> : b.email}</dd></div>
        <div><dt className="st">Stall address</dt><dd>{b.address}</dd></div>
        <div><dt className="st">Hours</dt><dd>{b.hours}</dd></div>
        <div><dt className="st">Food licence (FSSAI)</dt><dd>{b.fssai}</dd></div>
        <div><dt className="st">GST</dt><dd>{b.gst}</dd></div>
      </dl>
      <p>When you write about an order, please tell us the order number (for example #0421) so we can find it quickly. We reply within {b.replyTime}.</p>
    </PolicyPage>
  )
}
