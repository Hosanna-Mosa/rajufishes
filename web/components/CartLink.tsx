'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCartCount } from '@/lib/cart'

export function CartLink({ on }: { on?: boolean }) {
  const n = useCartCount()
  const [bump, setBump] = useState(0)
  useEffect(() => {
    const f = () => setBump((b) => b + 1)
    window.addEventListener('rf-bump', f)
    return () => window.removeEventListener('rf-bump', f)
  }, [])
  return (
    <Link href="/cart" className={`cartbtn ${on ? ' on' : ''}`} aria-label={`Cart, ${n} items`}>
      Cart (<span key={bump} className={bump ? 'bump' : undefined}>{n}</span>)
    </Link>
  )
}
