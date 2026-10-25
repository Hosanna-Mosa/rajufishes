import { business } from '@/config/business'
import { getSite, type Contact } from './api'

/** The marker shown where a detail has not been filled in. */
export const todo = (what: string) => `[ADD YOUR ${what.toUpperCase()}]`

export type LoginMode = 'guest' | 'account' | 'otp'
export type Resolved = {
  b: Record<keyof typeof business, string> & { freeOver: string; freeOverRupees: number }
  /** Same details, raw (empty when not filled in) for links and logic */
  raw: { phone: string; email: string; whatsapp: string; address: string }
  contact: Contact | null
  loginMode: LoginMode
}

const LABEL: Record<keyof typeof business, string> = {
  name: 'business name', legalName: 'owner or legal name', address: 'address', phone: 'phone number', email: 'email', fssai: 'FSSAI number',
  gst: 'GST number', deliveryZones: 'delivery areas', freeDeliveryOver: 'free delivery amount', refundWindow: 'refund window', coldChain: 'cold chain note',
  cancellationRule: 'cancellation rule', hours: 'opening hours', freshCutoff: 'fresh fish cut-off time', deliverySlots: 'delivery slots', daysClosed: 'days closed',
  dryDispatchDays: 'dry pack packing days', dryDeliveryDays: 'dry pack delivery days', refundPayoutDays: 'refund payout days', refundByCash: 'cash order refund method',
  replyTime: 'reply time', deliveryPartner: 'delivery partner', recordsYears: 'records years', taxNote: 'tax note', weightRule: 'weight rule', courtCity: 'court city', lastUpdated: 'last updated date',
}

/** Config file first, then anything the family typed in Admin > Delivery on top. Blanks become [ADD YOUR ...]. */
export async function getBusiness(): Promise<Resolved> {
  const site = await getSite()
  const c = site?.contact ?? null
  const merged: Record<string, string> = {}
  for (const k of Object.keys(business) as (keyof typeof business)[]) merged[k] = String(business[k] || '')
  if (c?.businessName) merged.name = c.businessName
  if (c?.phone) merged.phone = c.phone
  if (c?.email) merged.email = c.email
  if (c?.address) merged.address = c.address
  if (c?.hours) merged.hours = c.hours
  const rupees = site?.freeOver ? Math.round(site.freeOver / 100) : business.freeDeliveryOver
  merged.freeDeliveryOver = rupees ? String(rupees) : ''
  const raw = { phone: merged.phone, email: merged.email, whatsapp: c?.whatsapp ?? '', address: merged.address }
  const b = {} as Resolved['b']
  for (const k of Object.keys(business) as (keyof typeof business)[]) (b as Record<string, string>)[k] = merged[k] || todo(LABEL[k])
  b.freeOverRupees = rupees
  b.freeOver = rupees ? `₹${rupees.toLocaleString('en-IN')}` : todo('free delivery amount')
  return { b, raw, contact: c, loginMode: site?.loginMode ?? 'account' }
}
