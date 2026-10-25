'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/** A thin brand-blue line at the top that runs from a link click until the next page has arrived. */
export function RouteProgress() {
  const path = usePathname()
  const sp = useSearchParams()
  const here = `${path}?${sp.toString()}`
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle')

  useEffect(() => {
    setState((s) => (s === 'run' ? 'done' : 'idle'))
    const t = setTimeout(() => setState('idle'), 400)
    return () => clearTimeout(t)
  }, [here])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const u = new URL(a.href, location.href)
      if (u.origin !== location.origin) return
      if (u.pathname === location.pathname && u.search === location.search) return
      setState('run')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // never leave the line running if a navigation was cancelled
  useEffect(() => {
    if (state !== 'run') return
    const t = setTimeout(() => setState('idle'), 10000)
    return () => clearTimeout(t)
  }, [state])

  return <div className={`rprog ${state}`} aria-hidden="true" />
}
