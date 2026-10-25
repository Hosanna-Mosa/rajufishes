import Link from 'next/link'
import type { Product } from '@/lib/api'
import { CATEGORY_LABEL, priceText } from '@/lib/format'
import { FreshLine } from './FreshLine'
import { AddButton } from './AddButton'
import { ProductImage } from './ProductImage'
import { SelectLink } from './TrackedLink'
import { productItem } from '@/lib/analyticsItems'

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const item = productItem(product)
  return (
    <article className="card">
      <SelectLink item={item} href={`/products/${product.slug}`} className={`card-top ${product.category}`} aria-label={`${CATEGORY_LABEL[product.category]}: ${product.name}`}>
        <ProductImage product={product} priority={priority} />
        <span className="kind">{CATEGORY_LABEL[product.category]}</span>
      </SelectLink>
      <div className="card-body">
        <div className="card-row">
          <SelectLink item={item} href={`/products/${product.slug}`} className="nm">{product.name}</SelectLink>
          {product.available ? <span className="price">{priceText(product)}</span> : <span className="sold">Sold out today</span>}
        </div>
        {product.note && <span className="note">{product.note}</span>}
        <FreshLine p={product} />
        <div className="card-foot"><AddButton product={product} /></div>
      </div>
    </article>
  )
}
