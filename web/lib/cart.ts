'use client'
import { useSyncExternalStore } from 'react'

/** The cart lives in this browser only (choices, not prices). The cart page and checkout come in Round 3. */
export type CartLine = { productId: string; slug: string; cut: string | null; weightG: number | null; qty: number }

const KEY = 'rf_cart'
const EVENT = 'rf-cart'
const MAX_QTY = 50

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter((l) => l && typeof l.productId === 'string' && typeof l.slug === 'string' && Number.isInteger(l.qty) && l.qty > 0)
      .map((l) => ({ productId: l.productId, slug: l.slug, cut: l.cut ?? null, weightG: l.weightG ?? null, qty: Math.min(l.qty, MAX_QTY) }))
  } catch {
    return []
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    /* private mode or full storage: the cart just will not persist */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function addToCart(line: CartLine) {
  const lines = read()
  const same = lines.find((l) => l.productId === line.productId && l.cut === line.cut && l.weightG === line.weightG)
  if (same) same.qty = Math.min(same.qty + line.qty, MAX_QTY)
  else lines.push({ ...line, qty: Math.min(line.qty, MAX_QTY) })
  write(lines)
}

const count = () => read().reduce((n, l) => n + l.qty, 0)
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}
export const useCartCount = () => useSyncExternalStore(subscribe, count, () => 0)
