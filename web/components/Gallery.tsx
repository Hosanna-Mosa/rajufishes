'use client'
import { useRef, useState } from 'react'
import type { Product } from '@/lib/api'
import { sized } from '@/lib/img'
import { ProductImage } from './ProductImage'

export function Gallery({ product }: { product: Product }) {
  const [i, setI] = useState(0)
  const imgs = product.images ?? []
  const current = imgs[i] ? { ...product, images: [imgs[i]] } : product
  const slots = Math.min(imgs.length, 4)
  const x0 = useRef<number | null>(null)
  const swipe = (dx: number) => { if (Math.abs(dx) < 40 || slots < 2) return; setI((n) => Math.max(0, Math.min(slots - 1, n + (dx < 0 ? 1 : -1)))) }
  return (
    <div className="gal">
      <div className={`gal-main ${product.category}`} onTouchStart={(e) => { x0.current = e.touches[0].clientX }} onTouchEnd={(e) => { if (x0.current !== null) swipe(e.changedTouches[0].clientX - x0.current); x0.current = null }}>
        <ProductImage product={current} label={`Photo placeholder: ${product.name.toLowerCase()}`} priority sizes="(max-width: 900px) 100vw, 50vw" />
      </div>
      {slots > 1 && <div className="dots" role="group" aria-label="Photos">{Array.from({ length: slots }, (_, n) => <button key={n} type="button" className={n === i ? 'on' : ''} aria-label={`Photo ${n + 1} of ${slots}`} aria-pressed={n === i} onClick={() => setI(n)} />)}</div>}
      {slots > 1 && <div className="thumbs">
        {Array.from({ length: slots }, (_, n) => (
          <button key={n} type="button" className={n === i ? 'on' : ''} aria-label={`Photo ${n + 1}`} aria-pressed={n === i} onClick={() => setI(n)}>
            {imgs[n]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sized(imgs[n].url, 160)} alt="" width={80} height={80} loading="lazy" decoding="async" />
            )}
          </button>
        ))}
      </div>}
    </div>
  )
}
