import type { Order } from '../models/Order.js'
import { env } from '../config/env.js'
import { mailer } from './mail.js'

type OrderDoc = InstanceType<typeof Order>

const rupees = (paise?: number | null) => `Rs ${((paise ?? 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export function orderEmailText(o: OrderDoc): string {
  const a = o.shippingAddress as any
  const lines = o.items.map((i) => {
    const bits = [i.cut, i.weightG ? `${i.weightG} g` : ''].filter(Boolean).join(', ')
    return `  - ${i.name} x ${i.qty}${bits ? ` (${bits})` : ''}  ${rupees(i.lineTotal)}`
  })
  const pay = o.payment?.method === 'cod' ? 'Cash on delivery (collect on delivery)' : 'Paid online'
  return [
    `New order #${o.orderNo}`, '',
    `Customer: ${o.contact?.name}`, `Phone: ${o.contact?.phone}`,
    `Address: ${[a?.line1, a?.line2, a?.city, a?.state, a?.pincode].filter(Boolean).join(', ')}`,
    `Delivery slot: ${o.deliverySlot}`, '', 'Items:', ...lines, '',
    `Delivery: ${rupees(o.deliveryCharge)}`, ...(o.discount ? [`Discount: -${rupees(o.discount)}`] : []),
    `Total: ${rupees(o.total)}`, `Payment: ${pay}`,
  ].join('\n')
}

/**
 * Tells the owner about a new order. Callers do not wait for it and it never throws,
 * so a mail problem can never fail or slow an order.
 */
export async function notifyOrderPlaced(order: OrderDoc): Promise<void> {
  if (!env.OWNER_EMAIL) { console.warn('New order but OWNER_EMAIL is empty, so no email was sent.'); return }
  await mailer.send({ to: env.OWNER_EMAIL, subject: `New order #${order.orderNo} - ${rupees(order.total)}`, text: orderEmailText(order) })
}

export async function notifyStatusChanged(order: OrderDoc, from: string, to: string): Promise<void> {
  // customer messages are a later step
  void order; void from; void to
}

export const safely = (p: Promise<void>) => p.catch((e) => console.error('notification failed', e))
