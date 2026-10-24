import type { Product } from '@/lib/api'

/** The product's own photo when it has one, otherwise the striped placeholder from the design. */
export function ProductImage({ product, label, height, priority }: { product: Pick<Product, 'images' | 'name'>; label?: string; height?: number; priority?: boolean }) {
  const img = product.images?.[0]
  const style = height ? { height } : undefined
  if (img?.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="ph" src={img.url} alt={img.alt || product.name} loading={priority ? 'eager' : 'lazy'} decoding="async" style={style} />
  }
  return (
    <span className="ph" style={style} role="img" aria-label={`${product.name} photo coming soon`}>
      {label}
    </span>
  )
}
