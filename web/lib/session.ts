'use client'
import { useSyncExternalStore } from 'react'
import { ApiError, call } from './client'
import { readCart, writeCart, type CartLine } from './cart'

export type Customer = { id: string; phone: string; name: string; email: string }

/** undefined = still checking, null = signed out */
let state: Customer | null | undefined
let started = false
const listeners = new Set<() => void>()
const set = (c: Customer | null) => { state = c; listeners.forEach((l) => l()) }

export async function refreshCustomer() {
  try {
    set((await call<{ customer: Customer | null }>('/session')).customer)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) set(null)
    else if (state === undefined) set(null)
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!started) { started = true; void refreshCustomer() }
  return () => { listeners.delete(cb) }
}
export const useCustomer = () => useSyncExternalStore(subscribe, () => state, () => undefined)

/** Brings the browser cart into the account: the saved cart and this browser's cart are combined. */
export async function mergeCartIntoAccount() {
  const local = readCart()
  try {
    const { items } = await call<{ items: CartLine[] }>('/me/cart/merge', { method: 'POST', body: { items: local } })
    writeCart(items.map((l) => ({ productId: l.productId, slug: l.slug, cut: l.cut ?? null, weightG: l.weightG ?? null, qty: l.qty })))
  } catch { /* keep the browser cart as it is */ }
}

export async function signedIn(customer: Customer) {
  set(customer)
  await mergeCartIntoAccount()
}

export async function signOut() {
  try { await call('/auth/logout', { method: 'POST', body: {} }) } catch { /* the cookie also expires on its own */ }
  set(null)
}

/** Keeps the saved cart equal to the browser cart while signed in. */
let lastSaved = ''
export function saveCartIfSignedIn() {
  if (!state) return
  const json = JSON.stringify(readCart())
  if (json === lastSaved) return
  lastSaved = json
  void call('/me/cart', { method: 'PUT', body: { items: readCart() } }).catch(() => { lastSaved = '' })
}
