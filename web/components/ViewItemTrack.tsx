'use client'
import { useEffect } from 'react'
import type { Product } from '@/lib/api'
import { trackViewItem } from '@/lib/analytics'
import { productItem } from '@/lib/analyticsItems'

/** Reports view_item once when a product page opens. Draws nothing. */
export function ViewItemTrack({ product }: { product: Product }) {
  useEffect(() => { trackViewItem(productItem(product)) }, [product])
  return null
}
