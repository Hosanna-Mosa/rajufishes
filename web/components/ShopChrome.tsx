'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** The shop's header, footer and cart sync are not shown inside /admin. */
export function ShopChrome({ children }: { children: ReactNode }) {
  return usePathname().startsWith('/admin') ? null : <>{children}</>
}
