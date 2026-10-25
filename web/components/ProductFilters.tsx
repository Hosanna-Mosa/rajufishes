'use client'
import { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { GROUPS, SORTS } from '@/lib/api'
import { PincodeCheck } from './PincodeCheck'

export function ProductFilters({ selected, sort, q = '' }: { selected: string[]; sort: string; q?: string; counts?: Record<string, number>; total?: number }) {
  const router = useRouter()
  const path = usePathname()
  const [pending, start] = useTransition()

  function go(groups: string[], nextSort: string) {
    const u = new URLSearchParams()
    if (groups.length > 0 && groups.length < GROUPS.length) u.set('group', groups.join(','))
    if (q) u.set('q', q)
    if (nextSort !== 'landed') u.set('sort', nextSort)
    start(() => router.push(`${path}${u.size ? `?${u}` : ''}`))
  }

  return (
    <div className={`filterbar${pending ? ' pending' : ''}`}>
      <div className="fb-sort">
        <label className="lbl" htmlFor="sort">Sort by</label>
        <select id="sort" className="plainsel" value={sort} onChange={(e) => go(selected, e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <PincodeCheck compact />
    </div>
  )
}
