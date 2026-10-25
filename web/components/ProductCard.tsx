import Link from 'next/link'
import type { Product } from '@/lib/api'
import { CATEGORY_LABEL, priceText } from '@/lib/format'
import { AddButton } from './AddButton'
import { ProductImage } from './ProductImage'

export function ProductCard({ product, imgHeight }: { product: Product; imgHeight?: number }) {
  return (
    <article className="card">
      <Link href={`/products/${product.slug}`} className={`card-top ${product.category}`} aria-label={`${CATEGORY_LABEL[product.category]}: ${product.name}`}>
        <span className="kind st">{CATEGORY_LABEL[product.category]}</span>
        <ProductImage product={product} height={imgHeight} />
      </Link>
      <div className="card-body">
        <Link href={`/products/${product.slug}`} className="nm st">{product.name}</Link>
        {product.note && <span className="note">{product.note}</span>}
        <div className="card-foot">
          {product.available ? <span className="tag lg st">{priceText(product)}</span> : <span className="sold">Sold out today</span>}
          <AddButton product={product} />
        </div>
      </div>
    </article>
  )
}
