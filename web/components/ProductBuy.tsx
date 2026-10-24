'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/api'
import { addToCart } from '@/lib/cart'
import { rupees, unitPrice, weightLabel } from '@/lib/format'
import { PincodeCheck } from './PincodeCheck'

export function ProductBuy({ product }: { product: Product }) {
  const router = useRouter()
  const [cut, setCut] = useState(product.cuts[0]?.name ?? null)
  const [weightG, setWeightG] = useState<number | null>(product.unit === 'kg' ? (product.weights.includes(1000) ? 1000 : product.weights[0] ?? 1000) : null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const delta = product.cuts.find((c) => c.name === cut)?.priceDeltaPerKg ?? 0
  const each = unitPrice(product, delta, weightG)
  const perKg = product.price + delta

  function add() {
    addToCart({ productId: product._id, slug: product.slug, cut, weightG, qty })
  }

  return (
    <>
      <div className="pr">
        <span className="tag xl st">{product.unit === 'kg' ? `${rupees(perKg)} / kg` : `${rupees(each)} / pack`}</span>
        {product.unit === 'kg' && weightG && <span>{weightLabel(weightG)} = {rupees(each)}</span>}
      </div>
      {product.description && <p className="desc">{product.description}</p>}

      {product.cuts.length > 0 && (
        <div>
          <div className="opt-h st">Cut</div>
          <div className="chips" role="group" aria-label="Cut">
            {product.cuts.map((c) => (
              <button key={c.name} type="button" className="chip st" aria-pressed={cut === c.name} onClick={() => setCut(c.name)}>{c.name}</button>
            ))}
          </div>
        </div>
      )}
      {product.unit === 'kg' && product.weights.length > 0 && (
        <div>
          <div className="opt-h st">Weight</div>
          <div className="chips" role="group" aria-label="Weight">
            {product.weights.map((w) => (
              <button key={w} type="button" className="chip st" aria-pressed={weightG === w} onClick={() => setWeightG(w)}>{weightLabel(w)}</button>
            ))}
          </div>
        </div>
      )}

      {product.available ? (
        <div className="buyrow">
          <div className="qty st" role="group" aria-label="Quantity">
            <button type="button" aria-label="One less" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span aria-live="polite">{qty}</span>
            <button type="button" aria-label="One more" onClick={() => setQty(Math.min(50, qty + 1))}>+</button>
          </div>
          <button type="button" className="btn big yellow st" onClick={() => { add(); setAdded(true); setTimeout(() => setAdded(false), 1500) }}>
            {added ? 'Added to cart' : `Add to cart · ${rupees(each * qty)}`}
          </button>
          <button type="button" className="btn big dark st" onClick={() => { add(); router.push('/cart') }}>Buy now</button>
        </div>
      ) : (
        <p className="msg bad" style={{ fontSize: 18 }}>Sold out today. Please check again tomorrow morning.</p>
      )}

      <PincodeCheck fresh={product.category === 'fresh'} title="Check delivery to your pincode" />
    </>
  )
}
