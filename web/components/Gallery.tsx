'use client'
import { useState } from 'react'
import type { Product } from '@/lib/api'
import { sized } from '@/lib/img'
import { ProductImage } from './ProductImage'

export function Gallery({ product }: { product: Product }) {
  const [i, setI] = useState(0)
  const imgs = product.images ?? []
  const current = imgs[i] ? { ...product, images: [imgs[i]] } : product
  const slots = Math.max(4, Math.min(imgs.length, 4))
  return (
    <div className="gal">
      <div className={`gal-main ${product.category}`}>
        <ProductImage product={current} label={`Photo placeholder: ${product.name.toLowerCase()}`} priority sizes="(max-width: 900px) 100vw, 50vw" />
      </div>
      <div className="thumbs">
        {Array.from({ length: slots }, (_, n) => (
          <button key={n} type="button" className={n === i ? 'on' : ''} aria-label={`Photo ${n + 1}`} aria-pressed={n === i} onClick={() => setI(n)}>
            {imgs[n]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sized(imgs[n].url, 160)} alt="" width={80} height={80} loading="lazy" decoding="async" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
