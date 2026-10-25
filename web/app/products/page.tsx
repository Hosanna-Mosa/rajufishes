import Link from 'next/link'
import type { Metadata } from 'next'
import { GROUPS, SORTS, getProducts } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import { Tabs } from '@/components/Tabs'
import { ProductFilters } from '@/components/ProductFilters'
import { LocalImg } from '@/components/LocalImg'
import { CATEGORY_PHOTO, type CategoryKey } from '@/lib/photos'

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

  const kinds: [string, string[]][] = [['All', []], ['Fresh', ['Fresh fish', 'Prawns and crab']], ['Dry', ['Dry fish']], ['Frozen', ['Frozen packs']]]
  const same = (g: string[]) => g.length === selected.length && g.every((x) => selected.includes(x))
  const tab = (g: string[]) => {
    const q = new URLSearchParams()
    if (g.length) q.set('group', g.join(','))
    if (sort !== 'landed') q.set('sort', sort)
    return `/products${q.size ? `?${q}` : ''}`
  }

  const key: CategoryKey | null = selected.length === 0 ? null
    : selected.every((g) => g === 'Fresh fish') ? 'fresh'
    : selected.every((g) => g === 'Prawns and crab') ? 'prawns-crab'
    : selected.every((g) => g === 'Fresh fish' || g === 'Prawns and crab') ? 'fresh'
    : selected.every((g) => g === 'Dry fish') ? 'dry'
    : selected.every((g) => g === 'Frozen packs') ? 'frozen' : null
  const cat = key ? CATEGORY_PHOTO[key] : null

  return (
    <main>
      <div className="wrap">
        <div className={`banner${cat ? ' with-img' : ''}`}>
          <div>
            <h1>{cat ? cat.label : 'All products'}</h1>
            <p className="sub">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : ' '}</p>
          </div>
          {cat && <div className="banner-img"><LocalImg src={cat.src} alt={cat.alt} sizes="320px" priority /></div>}
        </div>
        <Tabs items={kinds.map(([label, g]) => ({ label, href: tab(g), on: same(g) }))} />
        <ProductFilters selected={selected} sort={sort} counts={counts} total={allTotal} />
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
