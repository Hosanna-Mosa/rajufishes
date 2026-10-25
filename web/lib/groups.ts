import { GROUPS } from './api'
import { CATEGORY_PHOTO, type CategoryKey } from './photos'

/** The four tabs of the shop. Every place that needs to know "which tab is this?" uses the functions below. */
export type TabKey = 'all' | 'fresh' | 'dry' | 'frozen'
export const TABS: { key: TabKey; label: string; groups: string[] }[] = [
  { key: 'all', label: 'All', groups: [] },
  { key: 'fresh', label: 'Fresh', groups: ['Fresh fish', 'Prawns and crab'] },
  { key: 'dry', label: 'Dry', groups: ['Dry fish'] },
  { key: 'frozen', label: 'Frozen', groups: ['Frozen packs'] },
]

const TAB_OF_GROUP: Record<string, TabKey> = Object.fromEntries(TABS.flatMap((t) => t.groups.map((g) => [g, t.key])))

/** "?group=" text (commas, or + for spaces already decoded) into known group names. Unknown names are dropped. */
export const parseGroups = (raw: string | null | undefined): string[] =>
  (raw ?? '').split(',').map((g) => g.trim()).filter((g) => (GROUPS as readonly string[]).includes(g))

/** One function from any group value(s) to a tab. Fresh fish and Prawns and crab are both "fresh"; mixed or empty is "all". */
export function tabFor(groups: string[]): TabKey {
  if (groups.length === 0) return 'all'
  const keys = new Set(groups.map((g) => TAB_OF_GROUP[g]))
  return keys.size === 1 ? [...keys][0]! : 'all'
}

/** The address of a tab, keeping the sort if there is one. */
export function tabHref(key: TabKey, sort = 'landed'): string {
  const t = TABS.find((x) => x.key === key)!
  const q = new URLSearchParams()
  if (t.groups.length) q.set('group', t.groups.join(','))
  if (sort !== 'landed') q.set('sort', sort)
  return `/products${q.size ? `?${q}` : ''}`
}

/** The heading and category photo for what is selected, or null for "All products". */
export function categoryFor(groups: string[]) {
  const key: CategoryKey | null = groups.length === 0 ? null
    : groups.every((g) => g === 'Fresh fish') ? 'fresh'
    : groups.every((g) => g === 'Prawns and crab') ? 'prawns-crab'
    : groups.every((g) => g === 'Fresh fish' || g === 'Prawns and crab') ? 'fresh'
    : groups.every((g) => g === 'Dry fish') ? 'dry'
    : groups.every((g) => g === 'Frozen packs') ? 'frozen' : null
  return key ? CATEGORY_PHOTO[key] : null
}
