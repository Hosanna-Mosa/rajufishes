'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from '@/lib/toast'

export type TabItem = { label: string; href: string; on: boolean }
type Spot = { x: number; w: number }
const memory = () => window as unknown as { __tabSpot?: Spot }

/** All / Fresh / Dry / Frozen as plain text tabs. The underline slides from the tab you left to the one you opened. */
export function Tabs({ items, note }: { items: TabItem[]; note?: string }) {
  const nav = useRef<HTMLElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const [js, setJs] = useState(false)

  useEffect(() => {
    const place = (animate: boolean) => {
      const n = nav.current, b = bar.current
      const cur = n?.querySelector<HTMLElement>('a.on')
      if (!n || !b || !cur) { if (b) b.style.opacity = '0'; return }
      const to: Spot = { x: cur.offsetLeft, w: cur.offsetWidth }
      const prev = memory().__tabSpot
      b.style.opacity = '1'
      b.style.transform = `translateX(${to.x}px) scaleX(${to.w})`
      if (animate && prev && !reducedMotion() && (prev.x !== to.x || prev.w !== to.w)) {
        b.animate([{ transform: `translateX(${prev.x}px) scaleX(${prev.w})` }, { transform: `translateX(${to.x}px) scaleX(${to.w})` }], { duration: 280, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' })
      }
      memory().__tabSpot = to
      setJs(true)
    }
    place(true)
    void document.fonts?.ready.then(() => place(false))
  }, [])

  return (
    <div className={`tabs${js ? ' js' : ''}`}>
      <nav aria-label="Categories" ref={nav}>
        {items.map((t) => (
          <Link key={t.label} href={t.href} className={t.on ? 'on' : undefined} aria-current={t.on ? 'page' : undefined}>{t.label}</Link>
        ))}
        <span className="tabbar" ref={bar} aria-hidden="true" />
      </nav>
      {note ? <span className="tabs-note">{note}</span> : null}
    </div>
  )
}
