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
      <svg className="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 4h2.5l2.2 11h10.6l2-8H6.4" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg>
      <span className="t">Cart (</span><span key={bump} data-n={n} className={bump ? 'bump' : undefined}>{n}</span><span className="t">)</span>
    </Link>
  )
}
