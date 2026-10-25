'use client'
import { useEffect, useState } from 'react'

type T = { id: number; text: string; out: boolean }

/** Toasts slide in from the top right and close themselves after 3 seconds. */
export function Toaster() {
  const [list, setList] = useState<T[]>([])
  useEffect(() => {
    let n = 0
    const on = (e: Event) => {
      const id = ++n
      const text = String((e as CustomEvent).detail)
      setList((l) => [...l.slice(-2), { id, text, out: false }])
      setTimeout(() => setList((l) => l.map((t) => (t.id === id ? { ...t, out: true } : t))), 2750)
      setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3000)
    }
    window.addEventListener('rf-toast', on)
    return () => window.removeEventListener('rf-toast', on)
  }, [])
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => <div key={t.id} className={`toast${t.out ? ' out' : ''}`}>{t.text}</div>)}
    </div>
  )
}
