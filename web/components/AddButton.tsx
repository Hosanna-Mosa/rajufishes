'use client'
import { useEffect, useRef, useState } from 'react'
import { notifyAdded } from '@/lib/toast'
import { SwapLabel, Tick } from './Motion'
import { addToCart } from '@/lib/cart'
import type { Product } from '@/lib/api'
import { trackAddToCart } from '@/lib/analytics'
import { productItem } from '@/lib/analyticsItems'

type Mini = Pick<Product, '_id' | 'slug' | 'unit' | 'weights' | 'cuts' | 'available' | 'name' | 'category' | 'price' | 'packWeightG'>

/** Quick add from a card: the first cut and 1 kg (or the smallest weight). Choices can be changed on the product page. */
export function AddButton({ product }: { product: Mini }) {
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const weightG = product.unit === 'kg' ? (product.weights.includes(1000) ? 1000 : product.weights[0] ?? 1000) : null
  return (
    <button
      type="button"
      className="btn add"
      disabled={!product.available}
      aria-label={`Add ${product.name} to cart`}
      onClick={() => {
        addToCart({ productId: product._id, slug: product.slug, cut: product.cuts[0]?.name ?? null, weightG, qty: 1 })
        trackAddToCart(productItem(product, { cutDelta: product.cuts[0]?.priceDeltaPerKg ?? 0, weightG }))
        setDone(true)
        notifyAdded(product.name)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setDone(false), 1400)
      }}
    >
      <SwapLabel on={done} a="Add" b={<>Added <Tick className={`tick${done ? ' draw' : ''}`} /></>} />
    </button>
  )
}
