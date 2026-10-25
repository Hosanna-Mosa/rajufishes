import type { Order } from '../models/Order.js'

type OrderDoc = InstanceType<typeof Order>

/**
 * Where customer messages will be sent from (email and SMS, a later round).
 * Nothing is sent yet. These never throw, so a failed message can never fail an order.
 */
export async function notifyOrderPlaced(order: OrderDoc): Promise<void> {
  // TODO: send "order placed" to order.contact.email / order.contact.phone and alert the family
  void order
}

export async function notifyStatusChanged(order: OrderDoc, from: string, to: string): Promise<void> {
  // TODO: send "your order is now <to>" to the customer
  void order; void from; void to
}

export const safely = (p: Promise<void>) => p.catch((e) => console.error('notification failed', e))
