'use client'
import { useEffect, useRef, useState } from 'react'
import { notifyAdded } from '@/lib/toast'
import { Roll, SwapLabel, Tick } from './Motion'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/api'
import { addToCart } from '@/lib/cart'
import { rupees, unitPrice, weightLabel } from '@/lib/format'
import { PincodeCheck } from './PincodeCheck'
import { trackAddToCart } from '@/lib/analytics'
import { productItem } from '@/lib/analyticsItems'

export function ProductBuy({ product }: { product: Product }) {
  const router = useRouter()
  const [cut, setCut] = useState(product.cuts[0]?.name ?? null)
  const [weightG, setWeightG] = useState<number | null>(product.unit === 'kg' ? (product.weights.includes(1000) ? 1000 : product.weights[0] ?? 1000) : null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [kb, setKb] = useState(false) // on-screen keyboard open: the sticky bar steps aside
  useEffect(() => {
    const vv = window.visualViewport
    const check = () => setKb(!!vv && window.innerHeight - vv.height > 140)
    vv?.addEventListener('resize', check)
    const typing = (e: Event) => { const t = e.target as HTMLElement; if (t.matches?.('input, textarea, select')) setKb(true) }
    const done = () => setKb(false)
    document.addEventListener('focusin', typing); document.addEventListener('focusout', done)
    return () => { vv?.removeEventListener('resize', check); document.removeEventListener('focusin', typing); document.removeEventListener('focusout', done) }
  }, [])

  const delta = product.cuts.find((c) => c.name === cut)?.priceDeltaPerKg ?? 0
  const each = unitPrice(product, delta, weightG)
  const perKg = product.price + delta

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  function add() {
    addToCart({ productId: product._id, slug: product.slug, cut, weightG, qty })
    trackAddToCart(productItem(product, { cutDelta: delta, weightG, qty }))
  }
  function addAndShow() {
    add()
    setAdded(true)
    notifyAdded(product.name)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAdded(false), 1400)
  }

  return (
    <>
      <div className="pr">
        <span className="price xl">{product.unit === 'kg' ? `${rupees(perKg)} / kg` : `${rupees(each)} / pack`}</span>
        {product.unit === 'kg' && weightG && <span>{weightLabel(weightG)} = {rupees(each)}</span>}
      </div>
      {product.description && <p className="desc">{product.description}</p>}

      {product.cuts.length > 0 && (
        <div>
          <div className="opt-h">Cut</div>
          <div className="chips" role="group" aria-label="Cut">
            {product.cuts.map((c) => (
              <button key={c.name} type="button" className="chip" aria-pressed={cut === c.name} onClick={() => setCut(c.name)}>{c.name}</button>
            ))}
          </div>
        </div>
      )}
      {product.unit === 'kg' && product.weights.length > 0 && (
        <div>
          <div className="opt-h">Weight</div>
          <div className="chips" role="group" aria-label="Weight">
            {product.weights.map((w) => (
              <button key={w} type="button" className="chip" aria-pressed={weightG === w} onClick={() => setWeightG(w)}>{weightLabel(w)}</button>
            ))}
          </div>
        </div>
      )}

      {product.available ? (
        <div className={`buyrow${kb ? ' kbd' : ''}`}>
          <div className="qty" role="group" aria-label="Quantity">
            <button type="button" aria-label="One less" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span aria-live="polite"><Roll value={qty} /></span>
            <button type="button" aria-label="One more" onClick={() => setQty(Math.min(50, qty + 1))}>+</button>
          </div>
          <button type="button" className="btn" onClick={addAndShow}>
            <SwapLabel on={added} a={`Add to cart · ${rupees(each * qty)}`} b={<>Added <Tick className={`tick${added ? ' draw' : ''}`} /></>} />
          </button>
          <button type="button" className="btn ghost" onClick={() => { add(); router.push('/cart') }}>Buy now</button>
        </div>
      ) : (
        <p className="msg">Sold out today. Please check again tomorrow morning.</p>
      )}

      <PincodeCheck fresh={product.category === 'fresh'} title="Check delivery to your pincode" />
    </>
  )
}
