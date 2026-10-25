import Link from 'next/link'
import type { Metadata } from 'next'
import { SORTS, getProducts } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import { Tabs } from '@/components/Tabs'
import { ProductFilters } from '@/components/ProductFilters'
import { LocalImg } from '@/components/LocalImg'
import { TABS, categoryFor, parseGroups, tabFor, tabHref } from '@/lib/groups'

const DESCRIPTION = 'Fresh fish, prawns and crab, dry fish and frozen packs from Raju Fishes. Filter by category and sort by price or catch time.'

/** The page title says the same thing as the heading. */
export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams
  const q = (one(sp.q) ?? '').trim()
  if (q.length >= 2) return { title: `Search: ${q.slice(0, 40)}`, description: DESCRIPTION, robots: { index: false } }
  const cat = categoryFor(parseGroups(one(sp.group)))
  return { title: cat ? cat.label : 'All products', description: DESCRIPTION }
}

const PAGE_SIZE = 9
type SP = Promise<{ [k: string]: string | string[] | undefined }>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function Products({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const selected = parseGroups(one(sp.group))
  const q = (one(sp.q) ?? '').trim().slice(0, 60)
  const searching = q.length >= 2
  const sort = SORTS.some((s) => s.value === one(sp.sort)) ? one(sp.sort)! : 'landed'
  const page = Math.max(1, parseInt(one(sp.page) ?? '1', 10) || 1)

  const data = await getProducts({ group: selected.join(','), q: searching ? q : undefined, sort, page, limit: PAGE_SIZE })
  const counts = Object.fromEntries((data?.counts ?? []).map((c) => [c.group, c.count]))
  const allTotal = (data?.counts ?? []).reduce((n, c) => n + c.count, 0)

  const link = (p: number) => {
    const u = new URLSearchParams()
    if (selected.length) u.set('group', selected.join(','))
    if (searching) u.set('q', q)
    if (sort !== 'landed') u.set('sort', sort)
    if (p > 1) u.set('page', String(p))
    return `/products${u.size ? `?${u}` : ''}`
  }

  const cat = categoryFor(selected)
  const activeTab = tabFor(selected)

  return (
    <main>
      <div className="wrap">
        <div className={`banner${cat && !searching ? ' with-img' : ''}`}>
          <div>
            <h1>{searching ? `Results for "${q}"` : cat ? cat.label : 'All products'}</h1>
            <p className="sub">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : ' '}</p>
          </div>
          {cat && !searching && <div className="banner-img"><LocalImg src={cat.src} alt={cat.alt} sizes="320px" priority /></div>}
        </div>
        <Tabs items={TABS.map((t) => ({ label: t.label, href: tabHref(t.key, sort), on: !searching && t.key === activeTab }))} />
        <ProductFilters selected={selected} sort={sort} q={searching ? q : ''} counts={counts} total={allTotal} />
        {!data && <p className="empty">We cannot load the products right now. <Link href="/products">Refresh</Link></p>}
        {data && data.items.length === 0 && (
          <p className="empty">{page > 1 ? 'That page does not exist.' : 'No products match these filters.'} <Link href="/products">Show all products</Link></p>
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="grid">{data.items.map((p, i) => <ProductCard key={p._id} product={p} priority={i < 4} />)}</div>
            {data.pages > 1 && (
              <nav className="pager" aria-label="Pages">
                {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                  <Link key={n} href={link(n)} className={n === data.page ? 'on' : ''} aria-current={n === data.page ? 'page' : undefined}>{n}</Link>
                ))}
                {data.page < data.pages && <Link href={link(data.page + 1)}>Next</Link>}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  )
}
