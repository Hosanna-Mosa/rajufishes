'use client'
import { useEffect, useRef, useState } from 'react'
import { rupees } from '@/lib/format'
import { reducedMotion } from '@/lib/toast'

/** A tick that draws itself. */
export function Tick({ className = 'tick' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 4.5" pathLength={1} />
    </svg>
  )
}

/** Two labels in the same spot, so the button keeps its width while the words swap. */
export function SwapLabel({ on, a, b }: { on: boolean; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <span className="swap">
      <span className={on ? 'out' : undefined}>{a}</span>
      <span className={on ? undefined : 'out'} aria-hidden={!on}>{b}</span>
    </span>
  )
}

/** A number that rolls up or down when it changes. */
export function Roll({ value }: { value: number }) {
  const [st, setSt] = useState({ v: value, dir: '' })
  if (st.v !== value) setSt({ v: value, dir: value > st.v ? 'up' : 'down' })
  return <span key={st.v} className={`roll ${st.dir}`}>{st.v}</span>
}

/** A money amount that counts from the old value to the new one. */
export function Ticker({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const cur = useRef(value)
  useEffect(() => {
    if (value === cur.current) return
    if (reducedMotion()) { cur.current = value; setShown(value); return }
    const from = cur.current, start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 250)
      cur.current = Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)))
      setShown(cur.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{rupees(shown)}</>
}
