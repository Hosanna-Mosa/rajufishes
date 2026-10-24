'use client'
import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { GROUPS, SORTS } from '@/lib/api'
import { PincodeCheck } from './PincodeCheck'

export function ProductFilters({ selected, sort, counts, total }: { selected: string[]; sort: string; counts: Record<string, number>; total: number }) {
  const router = useRouter()
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function go(groups: string[], nextSort: string) {
    const q = new URLSearchParams()
    if (groups.length > 0 && groups.length < GROUPS.length) q.set('group', groups.join(','))
    if (nextSort !== 'landed') q.set('sort', nextSort)
    start(() => router.push(`${path}${q.size ? `?${q}` : ''}`))
  }
  const active = selected.length === 0 ? [...GROUPS] : selected

  return (
    <>
      <button type="button" className="btn st filter-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide filters' : `Filters and sorting · ${total} products`}
      </button>
      <aside className={`side${open ? ' open' : ''}${pending ? ' pending' : ''}`} aria-label="Filters">
        <div className="panel">
          <div className="panel-h st">Category</div>
          <div className="panel-b">
            {GROUPS.map((g) => (
              <label key={g} className="chk">
                <input
                  type="checkbox"
                  checked={active.includes(g)}
                  onChange={(e) => go(e.target.checked ? [...active, g] : active.filter((x) => x !== g), sort)}
                />
                {g} ({counts[g] ?? 0})
              </label>
            ))}
          </div>
        </div>
        <PincodeCheck compact />
        <div className="panel">
          <div className="panel-h st">Sort by</div>
          <div className="panel-b">
            <label className="lbl" htmlFor="sort" style={{ position: 'absolute', left: -9999 }}>Sort by</label>
            <select id="sort" className="field" value={sort} onChange={(e) => go(selected, e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </aside>
    </>
  )
}
