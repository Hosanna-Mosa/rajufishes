'use client'
import Link from 'next/link'
import { useCartCount } from '@/lib/cart'

export function CartLink({ on }: { on?: boolean }) {
  const n = useCartCount()
  return (
    <Link href="/cart" className={`cartbtn ${on ? ' on' : ''}`} aria-label={`Cart, ${n} items`}>
      Cart ({n})
    </Link>
  )
}
