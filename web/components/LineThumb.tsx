import { ProductImage } from './ProductImage'

export function LineThumb({ image, name, category }: { image?: string | null; name: string; category: string }) {
  return (
    <span className={`thumb ${category}`}>
      <ProductImage product={{ name, images: image ? [{ url: image }] : [] }} />
    </span>
  )
}
