'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeLine, setQty, useCart, useCartCount } from '@/lib/cart'
import { optionsText, rupees } from '@/lib/format'
import { getSavedCoupon, saveCoupon, useQuote } from '@/lib/useQuote'
import { LineThumb } from './LineThumb'
import { Roll, Ticker } from './Motion'
import { reducedMotion } from '@/lib/toast'

export function CartCount() {
  const n = useCartCount()
  return <p className="sub">{n === 0 ? 'Nothing here yet' : `${n} ${n === 1 ? 'item' : 'items'}`}</p>
}

export function CartView() {
  const router = useRouter()
  const lines = useCart()
  const [coupon, setCoupon] = useState('')
  const [typed, setTyped] = useState('')
  const [couponMsg, setCouponMsg] = useState('')
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [lift, setLift] = useState<{ keys: string[]; h: number } | null>(null)
  const lineKey = (l: { productId: string; cut: string | null; weightG: number | null }) => `${l.productId}-${l.cut}-${l.weightG}`
  function drop(cl: Parameters<typeof removeLine>[0], key: string, row: HTMLElement | null) {
    if (reducedMotion()) { removeLine(cl); return }
    const all = quote?.lines.map(lineKey) ?? []
    const below = all.slice(all.indexOf(key) + 1)
    const h = row ? row.getBoundingClientRect().height : 0
    setLeaving(key)
    setTimeout(() => {
      removeLine(cl)
      setLeaving(null)
      if (below.length && h) { setLift({ keys: below, h }); setTimeout(() => setLift(null), 250) }
    }, 280)
  }

  useEffect(() => { const c = getSavedCoupon(); setCoupon(c); setTyped(c); setReady(true) }, [])
  const { quote, error, loading } = useQuote(ready ? lines : [], { coupon })

  useEffect(() => {
    if (!quote) return
    if (coupon && quote.couponError) setCouponMsg(quote.couponError)
    else if (coupon && quote.couponCode) setCouponMsg(`${quote.couponCode} applied`)
    else setCouponMsg('')
  }, [quote, coupon])

  async function apply(e: React.FormEvent) {
    e.preventDefault()
    const code = typed.trim().toUpperCase()
    saveCoupon(code)
    setCoupon(code)
    if (!code) setCouponMsg('')
  }

  if (ready && lines.length === 0) {
    return (
      <div className="wrap lost" style={{ padding: '56px var(--gut)' }}>
        <div className="empty">
          <h2>Your cart is empty</h2>
          <p>Add something fresh from the catch and it will show up here.</p>
          <Link href="/products" className="btn big" style={{ padding: '0 32px' }}>Shop the catch</Link>
        </div>
      </div>
    )
  }

  const freeOver = quote?.zone?.freeOver ?? 99900
  const subtotal = quote?.subtotal ?? 0
  const pct = Math.min(100, Math.round((subtotal / freeOver) * 100))
  const problems = quote?.problems ?? []
  const unknown = new Set(problems.map((p) => p.productId).filter(Boolean))

  return (
    <div className="wrap cols">
      <div className="left" style={{ display: 'block' }}>
        {quote ? (
          <div className="fd">
            <p>
              {quote.amountToFreeDelivery > 0
                ? `Add ${rupees(quote.amountToFreeDelivery)} more for free delivery. Free over ${rupees(freeOver)}.`
                : `You get free delivery. Free over ${rupees(freeOver)}.`}
            </p>
            <div className="fdbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
          </div>
        ) : null}

        {error ? <p className="bad-t" role="alert">{error}</p> : null}
        {problems.map((p, i) => (
          <p key={i} className="bad-t" role="alert">
            {p.message}{' '}
            {p.productId ? <button className="linkbtn" onClick={() => lines.filter((l) => l.productId === p.productId).forEach(removeLine)}>Remove it</button> : null}
          </p>
        ))}

        <div className="lines">
          {quote
            ? quote.lines.map((l) => {
                const cl = lines.find((c) => c.productId === l.productId && c.cut === l.cut && (c.weightG === l.weightG || (c.weightG === null && l.weightG !== null)))
                  ?? lines.find((c) => c.productId === l.productId && c.cut === l.cut)
                if (!cl) return null
                return (
                  <div
                    className={`line${leaving === lineKey(l) ? ' leaving' : ''}${lift?.keys.includes(lineKey(l)) ? ' ease-up' : ''}`}
                    style={lift?.keys.includes(lineKey(l)) ? ({ '--line-h': `${lift.h}px` } as React.CSSProperties) : undefined}
                    key={lineKey(l)}
                  >
                    <LineThumb image={l.image} name={l.name} category={l.category} />
                    <div className="lbody">
                      <Link href={`/products/${l.slug}`} className="lname">{l.name}</Link>
                      <div className="lopt">{optionsText(l)}</div>
                      <button className="lrm" onClick={(e) => drop(cl, lineKey(l), e.currentTarget.closest('.line'))} aria-label={`Remove ${l.name}`}>Remove</button>
                    </div>
                    <div className="stepper">
                      <button onClick={() => setQty(cl, cl.qty - 1)} aria-label="One less">−</button>
                      <span aria-live="polite"><Roll value={cl.qty} /></span>
                      <button onClick={() => setQty(cl, cl.qty + 1)} aria-label="One more">+</button>
                    </div>
                    <div className="ltot"><Ticker value={l.lineTotal} /></div>
                  </div>
                )
              })
            : lines.filter((l) => !unknown.has(l.productId)).map((l) => (
                <div className="line" key={`${l.productId}-${l.cut}-${l.weightG}`} aria-busy="true">
                  <span className="thumb" />
                  <div className="lbody"><span className="lname">{loading ? 'Loading…' : l.slug}</span></div>
                </div>
              ))}
        </div>
        <Link href="/products" className="keep">← Keep shopping</Link>
      </div>

      <aside className="right sum" aria-label="Order summary">
        <div className="sum-h">Order summary</div>
        <div className="sum-b">
          <div className="r"><span>Subtotal</span><b><Ticker value={subtotal} /></b></div>
          <div className="r"><span>Delivery</span><b>{!quote ? '…' : quote.deliveryCharge === 0 ? 'Free' : rupees(quote.deliveryCharge)}</b></div>
          {quote && quote.discount > 0 ? <div className="r"><span>Coupon {quote.couponCode}</span><b>−{rupees(quote.discount)}</b></div> : null}
          <form className="coup" onSubmit={apply}>
            <input aria-label="Coupon code" placeholder="Coupon code" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={30} autoCapitalize="characters" />
            <button type="submit">Apply</button>
          </form>
          {couponMsg ? <div className={quote?.couponError ? 'bad-t' : 'good-t'} role="status">{couponMsg}</div> : null}
          <div className="total"><span>Total</span><span><Ticker value={quote?.total ?? 0} /></span></div>
          <button className="go" disabled={!quote || problems.length > 0 || loading} onClick={() => router.push('/checkout')}>Go to checkout</button>
          <div className="note">Pay online or on delivery. Final delivery charge depends on your pincode.</div>
        </div>
      </aside>
    </div>
  )
}
