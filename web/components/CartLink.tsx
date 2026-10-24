'use client'
import Link from 'next/link'
import { useCartCount } from '@/lib/cart'

export function CartLink() {
  const n = useCartCount()
  return (
    <Link href="/cart" className="cartbtn st" aria-label={`Cart, ${n} items`}>
      Cart {n > 0 ? n : ''}
    </Link>
  )
}
