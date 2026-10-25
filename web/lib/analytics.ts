// Every analytics event the shop sends lives here, one function each. No other file types an event name.
// Only product info, order numbers, totals and anonymous behaviour go out: never a name, phone, email,
// address, full pincode or tracking link. Prices are given in paise (as the API sends them) and sent in rupees.

export type AItem = { id: string; name: string; category?: string; pricePaise: number; qty?: number }
type Params = Record<string, unknown>
export type Sink = (name: string, params: Params) => void

let sink: Sink | null = null
let queueing = false
const queue: [string, Params][] = []
const QUEUE_MAX = 40

/** The loader plugs Firebase in here once the visitor said OK. Tests plug in a recorder. Anything waiting is sent, in order. */
export function setSink(s: Sink | null) {
  sink = s
  if (!s) return
  for (const [n, p] of queue.splice(0)) try { s(n, p) } catch { /* ignore */ }
}
export const analyticsReady = () => sink !== null
/** While true, events wait in memory (never stored) for the visitor's OK and Firebase's start. Turning it off throws them away. */
export function setQueueing(on: boolean) { queueing = on; if (!on) queue.length = 0 }

const emit = (name: string, params: Params = {}) => {
  try {
    if (sink) sink(name, params)
    else if (queueing && queue.length < QUEUE_MAX) queue.push([name, params])
  } catch { /* analytics must never break the shop */ }
}

const CURRENCY = 'INR'
const rupees = (paise: number) => Math.round(paise) / 100

const itemOf = (i: AItem) => ({ item_id: i.id, item_name: i.name, item_category: i.category ?? '', price: rupees(i.pricePaise), quantity: i.qty ?? 1 })
const itemsOf = (items: AItem[]) => items.map(itemOf)
const valueOf = (items: AItem[]) => rupees(items.reduce((s, i) => s + i.pricePaise * (i.qty ?? 1), 0))
const cartParams = (items: AItem[]) => ({ currency: CURRENCY, value: valueOf(items), items: itemsOf(items) })

/** Page paths with a private bit in them are cut down to the page type. Query strings are never sent. */
export function safePath(path: string): string {
  const p = path.split(/[?#]/)[0] || '/'
  if (/^\/orders\/[^/]+/.test(p)) return '/orders/:id'
  if (/^\/reset-password/.test(p)) return '/reset-password'
  return p
}

export const trackPageView = (path: string) => emit('page_view', { page_path: safePath(path), page_location: safePath(path) })
export const trackSelectItem = (item: AItem, list = 'Products') => emit('select_item', { item_list_name: list, items: [itemOf(item)] })
export const trackViewItem = (item: AItem) => emit('view_item', { currency: CURRENCY, value: rupees(item.pricePaise * (item.qty ?? 1)), items: [itemOf(item)] })
export const trackSearch = (term: string) => emit('search', { search_term: term.trim().slice(0, 60) })
export const trackAddToCart = (item: AItem) => emit('add_to_cart', cartParams([item]))
export const trackRemoveFromCart = (item: AItem) => emit('remove_from_cart', cartParams([item]))
export const trackViewCart = (items: AItem[]) => emit('view_cart', cartParams(items))
export const trackBeginCheckout = (items: AItem[]) => emit('begin_checkout', cartParams(items))
export const trackAddShippingInfo = (items: AItem[], slot: string) => emit('add_shipping_info', { ...cartParams(items), shipping_tier: slot })
export const trackAddPaymentInfo = (items: AItem[], method: 'cod' | 'online') => emit('add_payment_info', { ...cartParams(items), payment_type: method === 'cod' ? 'COD' : 'Online' })
export const trackPurchase = (o: { orderNo: string; totalPaise: number; shippingPaise: number; items: AItem[] }) =>
  emit('purchase', { transaction_id: o.orderNo, currency: CURRENCY, value: rupees(o.totalPaise), shipping: rupees(o.shippingPaise), items: itemsOf(o.items) })
export const trackSignUp = (method: 'email' | 'phone') => emit('sign_up', { method })
export const trackLogin = (method: 'email' | 'phone') => emit('login', { method })
/** Only whether the check worked: never the pincode itself. */
export const trackPincodeCheck = (ok: boolean) => emit('pincode_check', { result: ok ? 'ok' : 'not_deliverable' })
export const trackTabFilter = (tab: string) => emit('tab_filter', { tab_name: tab })
export const trackContactClick = (kind: 'whatsapp' | 'call') => emit('contact_click', { contact_method: kind })

// ---- who is not counted ----
const NO_TRACK_KEY = 'rf_no_track'
/** Called when the family signs in to the admin on this browser: this browser is never counted. */
export function markNoTrack() { try { localStorage.setItem(NO_TRACK_KEY, '1') } catch { /* blocked storage */ } }
export function isNoTrack(path: string): boolean {
  if (path === '/admin' || path.startsWith('/admin/')) return true
  try { return localStorage.getItem(NO_TRACK_KEY) === '1' } catch { return false }
}
