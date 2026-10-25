'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '@/lib/client'

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="a-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="small a-sub">{sub}</p>}
      </div>
      {children && <div className="a-head-r">{children}</div>}
    </div>
  )
}

/** Loads data when the page opens and again on demand. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const run = useCallback(async () => {
    try { setData(await fn()); setError('') } catch (e) { setError(e instanceof ApiError ? e.message : 'Something went wrong.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { void run() }, [run])
  return { data, error, reload: run }
}

export const errText = (e: unknown) => {
  if (e instanceof ApiError) {
    const d = e.details as { fields?: Record<string, string[]> } | undefined
    const first = d?.fields ? Object.entries(d.fields)[0] : null
    return first ? `${first[0]}: ${first[1][0]}` : e.message
  }
  return 'Something went wrong. Please try again.'
}

export function Notice({ kind, children }: { kind: 'ok' | 'bad'; children: ReactNode }) {
  return <div className={`a-note ${kind}`} role={kind === 'bad' ? 'alert' : 'status'}>{children}</div>
}

export function Pill({ tone, children }: { tone: 'blue' | 'yellow' | 'red' | 'green' | 'grey'; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

export const statusTone = (s: string) => (s === 'placed' ? 'yellow' : s === 'cancelled' ? 'red' : s === 'delivered' ? 'green' : 'blue') as 'yellow' | 'red' | 'green' | 'blue'
export const payTone = (s?: string) => (s === 'paid' || s === 'cod_collected' ? 'green' : s === 'cod_due' || s === 'pending' ? 'yellow' : s === 'refunded' || s === 'failed' ? 'red' : 'grey') as 'green' | 'yellow' | 'red' | 'grey'

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`sw ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span>{on ? 'Shown' : 'Hidden'}</span>
    </button>
  )
}

export function Loading({ error }: { error?: string }) {
  return error ? <Notice kind="bad">{error}</Notice> : <p className="small">Loading…</p>
}
