import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as A from '../../web/lib/analytics'

type Hit = { name: string; params: Record<string, unknown> }
let hits: Hit[] = []
beforeEach(() => { hits = []; A.setQueueing(false); A.setSink((name, params) => hits.push({ name, params })) })
afterEach(() => { A.setSink(null); A.setQueueing(false) })

const fish = { id: 'p1', name: 'Seer fish', category: 'fresh', pricePaise: 90000, qty: 2 }
const pack = { id: 'p2', name: 'Dry anchovies', category: 'dry', pricePaise: 25050 }

describe('storefront analytics payloads', () => {
  it('sends items, value and currency in rupees', () => {
    A.trackAddToCart(fish)
    expect(hits[0]).toEqual({ name: 'add_to_cart', params: { currency: 'INR', value: 1800, items: [{ item_id: 'p1', item_name: 'Seer fish', item_category: 'fresh', price: 900, quantity: 2 }] } })
    A.trackViewCart([fish, pack])
    expect(hits[1].params.value).toBe(2050.5)
    expect((hits[1].params.items as unknown[]).length).toBe(2)
  })

  it('purchase carries the order number, totals and items', () => {
    A.trackPurchase({ orderNo: '0421', totalPaise: 190000, shippingPaise: 10000, items: [fish] })
    expect(hits[0].name).toBe('purchase')
    expect(hits[0].params).toMatchObject({ transaction_id: '0421', currency: 'INR', value: 1900, shipping: 100 })
    expect((hits[0].params.items as { price: number }[])[0].price).toBe(900)
  })

  it('uses the standard GA4 names, one function each', () => {
    A.trackPageView('/products'); A.trackSelectItem(fish); A.trackViewItem(fish); A.trackSearch('prawns'); A.trackRemoveFromCart(fish)
    A.trackBeginCheckout([fish]); A.trackAddShippingInfo([fish], 'tomorrow_morning'); A.trackAddPaymentInfo([fish], 'cod')
    A.trackSignUp('email'); A.trackLogin('phone'); A.trackPincodeCheck(true); A.trackTabFilter('Fresh'); A.trackContactClick('whatsapp')
    expect(hits.map((h) => h.name)).toEqual(['page_view', 'select_item', 'view_item', 'search', 'remove_from_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'sign_up', 'login', 'pincode_check', 'tab_filter', 'contact_click'])
    expect(hits[10].params).toEqual({ result: 'ok' })
    A.trackPincodeCheck(false)
    expect(hits[13].params).toEqual({ result: 'not_deliverable' })
    expect(hits[7].params.payment_type).toBe('COD')
  })

  it('never sends personal data: no private keys, no phone, email, pincode or tracking link', () => {
    A.trackPageView('/orders/0421?token=abc123secret'); A.trackPageView('/reset-password?token=zzz'); A.trackPageView('/track?phone=9876543210')
    A.trackSearch('seer fish'); A.trackPincodeCheck(true)
    A.trackPurchase({ orderNo: '0421', totalPaise: 100, shippingPaise: 0, items: [fish] })
    A.trackSignUp('email'); A.trackLogin('phone'); A.trackAddShippingInfo([fish], 'tomorrow_morning')
    const banned = /^(name|phone|mobile|email|address|line1|line2|city|pincode|pin|zip|token|track|customer|password)$/i
    const walk = (v: unknown, path: string[]) => {
      if (Array.isArray(v)) return v.forEach((x) => walk(x, path))
      if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => { expect(k, path.join('.')).not.toMatch(banned); walk(x, [...path, k]) })
      if (typeof v === 'string') {
        expect(v).not.toMatch(/@/); expect(v).not.toMatch(/\b\d{6}\b/); expect(v).not.toMatch(/\d{10}/); expect(v).not.toMatch(/token|https?:/i)
      }
    }
    hits.forEach((h) => walk(h.params, [h.name]))
    expect(hits[0].params).toEqual({ page_path: '/orders/:id', page_location: '/orders/:id' })
    expect(hits[1].params.page_path).toBe('/reset-password')
    expect(hits[2].params.page_path).toBe('/track')
  })
})

describe('waiting for consent', () => {
  it('holds events in order until the sink arrives, and drops them when declined', () => {
    A.setSink(null); A.setQueueing(true)
    A.trackPageView('/'); A.trackViewItem(fish)
    expect(hits).toHaveLength(0)
    A.setSink((name, params) => hits.push({ name, params }))
    expect(hits.map((h) => h.name)).toEqual(['page_view', 'view_item'])
    A.setSink(null); A.setQueueing(true); A.trackSearch('x'); A.setQueueing(false)
    A.setSink((name, params) => hits.push({ name, params }))
    expect(hits).toHaveLength(2) // the declined visitor's event was thrown away
  })
  it('does nothing and does not throw with no sink and no queue', () => {
    A.setSink(null)
    expect(() => A.trackPurchase({ orderNo: '1', totalPaise: 1, shippingPaise: 0, items: [fish] })).not.toThrow()
  })
  it('never counts admin pages', () => {
    expect(A.isNoTrack('/admin/orders')).toBe(true)
    expect(A.isNoTrack('/admin')).toBe(true)
    expect(A.isNoTrack('/administrators-of-fish')).toBe(false)
  })
})
