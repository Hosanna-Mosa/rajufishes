'use client'
import { API } from './api'

/** Calls from the browser. Cookies go along so a signed in customer is recognised. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
  }
}

export async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'We could not reach the shop. Check your internet and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Something went wrong. Please try again.', (data as { details?: unknown }).details)
  return data as T
}

export type QuoteLine = {
  productId: string; slug: string; name: string; image?: string | null; category: 'fresh' | 'dry' | 'frozen'
  cut: string | null; weightG: number | null; qty: number; unitPrice: number; lineTotal: number
}
export type Quote = {
  estimated?: boolean
  lines: QuoteLine[]; subtotal: number; deliveryCharge: number; discount: number; total: number
  couponCode: string | null; couponError: string | null
  problems: { code: string; message: string; productId?: string }[]
  zone: { id: string; name: string; charge: number; freeOver: number; etaDays: number; codAllowed: boolean; freshAllowed: boolean } | null
  amountToFreeDelivery: number
}

export type OrderItem = {
  name: string; slug: string; image?: string | null; category: string; unit: 'kg' | 'pack'
  cut: string | null; weightG: number | null; qty: number; unitPrice: number; lineTotal: number; productId?: string
  caughtOn?: string | null; addedOn?: string | null // fresh items: dates saved when the order was placed
}
export type OrderT = {
  orderNo: string; status: 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItem[]; subtotal: number; deliveryCharge: number; discount: number; total: number; couponCode?: string | null
  payment: { method: 'razorpay' | 'cod'; status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cod_due' | 'cod_collected' }
  stockState?: string; holdExpiresAt?: string | null; createdAt: string
  deliverySlot?: string
  contact: { name: string; phone: string; email?: string }
  shippingAddress: { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string }
  statusHistory?: { status: string; at: string }[]
}
export type AddressT = {
  _id: string; label?: string; name: string; phone: string; line1: string; line2?: string
  city: string; state: string; pincode: string; isDefault?: boolean
}
export type Slot = { id: string; label: string }

export type RazorpayInfo = { orderId: string; keyId: string; amount: number; mock: boolean }
