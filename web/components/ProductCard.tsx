import Link from 'next/link'
import type { Product } from '@/lib/api'
import { CATEGORY_LABEL, priceText } from '@/lib/format'
import { AddButton } from './AddButton'
import { ProductImage } from './ProductImage'

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  return (
    <article className="card">
      <Link href={`/products/${product.slug}`} className={`card-top ${product.category}`} aria-label={`${CATEGORY_LABEL[product.category]}: ${product.name}`}>
        <ProductImage product={product} priority={priority} />
        <span className="kind">{CATEGORY_LABEL[product.category]}</span>
      </Link>
      <div className="card-body">
        <div className="card-row">
          <Link href={`/products/${product.slug}`} className="nm">{product.name}</Link>
          {product.available ? <span className="price">{priceText(product)}</span> : <span className="sold">Sold out today</span>}
        </div>
        {product.note && <span className="note">{product.note}</span>}
        <div className="card-foot"><AddButton product={product} /></div>
      </div>
    </article>
  )
}
