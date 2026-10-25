import type { Product } from '@/lib/api'
import { blurUrl, sized, srcSet } from '@/lib/img'

/** Same name, same tint. */
const tint = (name: string) => ([...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 8) + 1

const WIDTHS = [320, 640, 960, 1280]

/**
 * The product's own photo when it has one, otherwise a tinted placeholder block with a small label chip.
 * Photos get several sizes (the browser picks one), lazy loading and a blurred placeholder behind them.
 */
export function ProductImage({ product, label, priority, sizes = '(max-width: 760px) 50vw, 25vw' }: { product: Pick<Product, 'images' | 'name'>; label?: string; height?: number; priority?: boolean; sizes?: string }) {
  const img = product.images?.[0]
  const style: React.CSSProperties = {}
  if (img?.url) {
    const blur = blurUrl(img.url)
    if (blur) style.backgroundImage = `url(${blur})`
    style.backgroundSize = 'cover'
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="ph"
        src={sized(img.url, 640)}
        srcSet={srcSet(img.url, WIDTHS)}
        sizes={sizes}
        alt={img.alt || product.name}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        width={800}
        height={600}
        style={style}
      />
    )
  }
  return (
    <span className="ph" style={{ background: `var(--tint-${tint(product.name)})` }} role="img" aria-label={`${product.name} photo coming soon`}>
      {label ? <span className="chiplab">{label}</span> : null}
    </span>
  )
}
