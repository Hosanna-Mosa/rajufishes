'use client'
import { API } from './api'
import { ApiError, call } from './client'

export type AdminUser = { id: string; email: string; name: string; role: 'owner' | 'staff' }

/** Admin calls: same as the shop's, under /api/admin. The sign in cookie goes along. */
export const acall = <T,>(path: string, init: { method?: string; body?: unknown } = {}) => call<T>(`/admin${path}`, init)

/** Sends one photo as raw bytes. The API checks it really is a JPG, PNG or WebP. */
export async function uploadPhoto(file: File): Promise<{ url: string; publicId: string; local: boolean }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new ApiError(400, 'Please choose a JPG, PNG or WebP photo.')
  if (file.size > 6 * 1024 * 1024) throw new ApiError(400, 'That photo is over 6 MB. Please choose a smaller one.')
  let res: Response
  try {
    res = await fetch(`${API}/api/admin/uploads`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type }, body: file })
  } catch {
    throw new ApiError(0, 'Could not reach the shop. Check your internet and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'The photo could not be uploaded.')
  return data
}

export const STATUS_LABEL: Record<string, string> = { placed: 'New', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }
export const NEXT_STATUS: Record<string, { to: string; label: string } | undefined> = {
  placed: { to: 'packed', label: 'Mark packed' }, packed: { to: 'shipped', label: 'Mark shipped' }, shipped: { to: 'delivered', label: 'Mark delivered' },
}

export function payLabel(p: { method?: string; status?: string }) {
  const online = p.method === 'razorpay'
  switch (p.status) {
    case 'paid': return 'Paid online'
    case 'pending': return 'Waiting for payment'
    case 'failed': return online ? 'Payment failed' : 'Not paid'
    case 'refunded': return 'Refunded'
    case 'cod_due': return 'Cash to collect'
    case 'cod_collected': return 'Cash collected'
    default: return p.status ?? ''
  }
}

const IST = 'Asia/Kolkata'
export const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '')
export const fmtDay = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' }) : '')

/** "12.5" -> 1250 paise; null when it is not a sensible amount. */
export function toPaise(v: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(v.trim())) return null
  return Math.round(parseFloat(v) * 100)
}
export const fromPaise = (p: number) => String(p / 100)
