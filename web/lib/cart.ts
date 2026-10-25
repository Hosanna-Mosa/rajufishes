'use client'
import { useSyncExternalStore } from 'react'

/** The cart lives in this browser (choices, not prices). Prices always come from the API. */
export type CartLine = { productId: string; slug: string; cut: string | null; weightG: number | null; qty: number }

const KEY = 'rf_cart'
const EVENT = 'rf-cart'
export const MAX_QTY = 50

function parse(raw: string | null): CartLine[] {
  try {
    const list = JSON.parse(raw ?? '[]')
    if (!Array.isArray(list)) return []
    return list
      .filter((l) => l && typeof l.productId === 'string' && typeof l.slug === 'string' && Number.isInteger(l.qty) && l.qty > 0)
      .map((l) => ({ productId: l.productId, slug: l.slug, cut: l.cut ?? null, weightG: l.weightG ?? null, qty: Math.min(l.qty, MAX_QTY) }))
  } catch {
    return []
  }
}

let cachedRaw: string | null = null
let cachedLines: CartLine[] = []
const EMPTY: CartLine[] = []

/** Same array back while nothing changed, so React does not re-render for nothing. */
export function readCart(): CartLine[] {
  let raw: string | null = null
  try { raw = localStorage.getItem(KEY) } catch { /* blocked storage */ }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedLines = parse(raw)
  }
  return cachedLines
}

export function writeCart(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    cachedRaw = null
    cachedLines = lines // storage unavailable: the cart lasts until the page closes
  }
  window.dispatchEvent(new Event(EVENT))
}

const same = (a: CartLine, b: CartLine) => a.productId === b.productId && a.cut === b.cut && a.weightG === b.weightG

export function addToCart(line: CartLine) {
  const lines = readCart().map((l) => ({ ...l }))
  const hit = lines.find((l) => same(l, line))
  if (hit) hit.qty = Math.min(hit.qty + line.qty, MAX_QTY)
  else lines.push({ ...line, qty: Math.min(line.qty, MAX_QTY) })
  writeCart(lines)
}
export function setQty(line: CartLine, qty: number) {
  if (qty < 1) return removeLine(line)
  writeCart(readCart().map((l) => (same(l, line) ? { ...l, qty: Math.min(qty, MAX_QTY) } : l)))
}
export function removeLine(line: CartLine) {
  writeCart(readCart().filter((l) => !same(l, line)))
}
export const clearCart = () => writeCart([])

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}
export const useCart = () => useSyncExternalStore(subscribe, readCart, () => EMPTY)
export const useCartCount = () => {
  const lines = useCart()
  return lines.reduce((n, l) => n + l.qty, 0)
}
