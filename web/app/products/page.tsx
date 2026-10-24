import Link from 'next/link'
import type { Metadata } from 'next'
import { GROUPS, SORTS, getProducts } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import { ProductFilters } from '@/components/ProductFilters'
import { Stripes } from '@/components/Stripes'

export const metadata: Metadata = {
  title: 'All products',
  description: 'Fresh fish, prawns and crab, dry fish and frozen packs from Raju Fishes. Filter by category and sort by price or catch time.',
}

const PAGE_SIZE = 9
type SP = Promise<{ [k: string]: string | string[] | undefined }>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function Products({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const selected = (one(sp.group) ?? '').split(',').map((g) => g.trim()).filter((g) => (GROUPS as readonly string[]).includes(g))
  const sort = SORTS.some((s) => s.value === one(sp.sort)) ? one(sp.sort)! : 'landed'
  const page = Math.max(1, parseInt(one(sp.page) ?? '1', 10) || 1)

  const data = await getProducts({ group: selected.join(','), sort, page, limit: PAGE_SIZE })
  const counts = Object.fromEntries((data?.counts ?? []).map((c) => [c.group, c.count]))
  const allTotal = (data?.counts ?? []).reduce((n, c) => n + c.count, 0)

  const link = (p: number) => {
    const q = new URLSearchParams()
    if (selected.length) q.set('group', selected.join(','))
    if (sort !== 'landed') q.set('sort', sort)
    if (p > 1) q.set('page', String(p))
    return `/products${q.size ? `?${q}` : ''}`
  }

  return (
    <main>
      <div className="banner">
        <div className="wrap">
          <div className="crumb">Home / All products</div>
          <h1 className="st">All products</h1>
          <p className="sub">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : ' '}</p>
        </div>
        <Stripes />
      </div>
      <div className="wrap shop">
        <ProductFilters selected={selected} sort={sort} counts={counts} total={allTotal} />
        <div className="main">
          {!data && <div className="empty"><h2 className="st">Cannot load</h2>We cannot load the products right now. Please refresh in a minute.</div>}
          {data && data.items.length === 0 && (
            <div className="empty">
              <h2 className="st">Nothing here</h2>
              {page > 1 ? 'That page does not exist.' : 'No products match these filters.'} <Link href="/products" style={{ textDecoration: 'underline' }}>Show all products</Link>
            </div>
          )}
          {data && data.items.length > 0 && (
            <>
              <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} imgHeight={130} />)}</div>
              {data.pages > 1 && (
                <nav className="pager st" aria-label="Pages">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                    <Link key={n} href={link(n)} className={n === data.page ? 'on' : ''} aria-current={n === data.page ? 'page' : undefined}>{n}</Link>
                  ))}
                  {data.page < data.pages && <Link href={link(data.page + 1)}>Next</Link>}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
