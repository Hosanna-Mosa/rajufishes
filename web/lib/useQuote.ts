'use client'
import { useEffect, useState } from 'react'
import type { CartLine } from './cart'
import { ApiError, call, type Quote } from './client'

const COUPON_KEY = 'rf_coupon'
export const getSavedCoupon = () => { try { return localStorage.getItem(COUPON_KEY) ?? '' } catch { return '' } }
export const saveCoupon = (c: string) => { try { c ? localStorage.setItem(COUPON_KEY, c) : localStorage.removeItem(COUPON_KEY) } catch { /* ignore */ } }

type Opts = { coupon?: string; pincode?: string; state?: string; paymentMethod?: 'cod' | 'razorpay' }

/** The prices for the cart, always worked out by the API. */
export function useQuote(lines: CartLine[], opts: Opts = {}) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const key = JSON.stringify([lines, opts])

  useEffect(() => {
    if (lines.length === 0) { setQuote(null); setError(''); setLoading(false); return }
    let stale = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const q = await call<Quote>('/cart/quote', { method: 'POST', body: {
          items: lines.map(({ productId, cut, weightG, qty }) => ({ productId, cut, weightG, qty })),
          couponCode: opts.coupon || undefined,
          pincode: opts.pincode && /^\d{6}$/.test(opts.pincode) ? opts.pincode : undefined,
          state: opts.state || undefined,
          paymentMethod: opts.paymentMethod,
        } })
        if (!stale) { setQuote(q); setError('') }
      } catch (e) {
        if (!stale) setError(e instanceof ApiError ? e.message : 'We could not work out your prices.')
      } finally {
        if (!stale) setLoading(false)
      }
    }, 150)
    return () => { stale = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { quote, error, loading }
}
