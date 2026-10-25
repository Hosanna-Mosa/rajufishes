'use client'
import { useState } from 'react'
import { addToCart } from '@/lib/cart'
import type { Product } from '@/lib/api'

type Mini = Pick<Product, '_id' | 'slug' | 'unit' | 'weights' | 'cuts' | 'available' | 'name'>

/** Quick add from a card: the first cut and 1 kg (or the smallest weight). Choices can be changed on the product page. */
export function AddButton({ product }: { product: Mini }) {
  const [done, setDone] = useState(false)
  const weightG = product.unit === 'kg' ? (product.weights.includes(1000) ? 1000 : product.weights[0] ?? 1000) : null
  return (
    <button
      type="button"
      className="btn add"
      disabled={!product.available}
      aria-label={`Add ${product.name} to cart`}
      onClick={() => {
        addToCart({ productId: product._id, slug: product.slug, cut: product.cuts[0]?.name ?? null, weightG, qty: 1 })
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? 'Added' : 'Add'}
    </button>
  )
}
