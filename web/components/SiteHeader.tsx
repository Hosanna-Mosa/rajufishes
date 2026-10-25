'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { CartLink } from './CartLink'
import { SearchPanel } from './SearchPanel'
import { TopTicker } from './TopTicker'
import { useSite } from './SiteContext'
import { TABS, parseGroups, tabFor, tabHref, type TabKey } from '@/lib/groups'
import { useCustomer } from '@/lib/session'

/** Fresh / Dry / Frozen / About. The active one follows the address, using the same tab mapping as the shop page. */
function MainNav() {
  const path = usePathname()
  const sp = useSearchParams()
  const tab: TabKey | null = path === '/products' && !sp.get('q') ? tabFor(parseGroups(sp.get('group'))) : null
  return (
    <nav className="nav" aria-label="Main">
      {TABS.filter((t) => t.key !== 'all').map((t) => (
        <Link key={t.key} href={tabHref(t.key)} className={tab === t.key ? 'on' : undefined} aria-current={tab === t.key ? 'page' : undefined}>{t.label}</Link>
      ))}
      <Link href="/about" className={path === '/about' ? 'on' : undefined} aria-current={path === '/about' ? 'page' : undefined}>About</Link>
    </nav>
  )
}

function Who({ path }: { path: string }) {
  const c = useCustomer()
  const on = path.startsWith('/account') || path === '/sign-in' || path === '/sign-up'
  return (
    <Link href={c ? '/account' : '/sign-in'} className={on ? 'on' : undefined} style={c === undefined ? { visibility: 'hidden' } : undefined}>
      {c ? (c.name.trim().split(/\s+/)[0] || 'Account') : 'Sign in'}
    </Link>
  )
}

/** The full header, a plain one for checkout (logo and a way back) and one for the sign in pages. */
export function SiteHeader({ messages }: { messages: string[] }) {
  const path = usePathname()
  const mode = useSite().loginMode
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const plainBack = path === '/checkout' ? ['/cart', '← Back to cart'] : ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'].includes(path) ? ['/products', '← Back to the shop'] : null

  useEffect(() => { setOpen(false) }, [path])
  const close = () => { setOpen(false); btn.current?.focus() }

  return (
    <header>
      <TopTicker messages={messages} />
      <div className="wrap hdr">
        {plainBack ? (
          <>
            <Link href={plainBack[0]} className="backlink">{plainBack[1]}</Link>
            <Link href="/" className="logo">Raju Fishes</Link>
            <span />
          </>
        ) : (
          <>
            <Suspense fallback={<nav className="nav" aria-label="Main">{TABS.filter((t) => t.key !== 'all').map((t) => <Link key={t.key} href={tabHref(t.key)}>{t.label}</Link>)}<Link href="/about">About</Link></nav>}>
              <MainNav />
            </Suspense>
            <Link href="/" className="logo">Raju Fishes</Link>
            <div className="nav right">
              <button ref={btn} type="button" className="navbtn" aria-expanded={open} aria-controls="site-search" onClick={() => (open ? close() : setOpen(true))}>Search</button>
              {mode !== 'guest' && <Who path={path} />}
              <CartLink on={path === '/cart'} />
            </div>
          </>
        )}
      </div>
      {open && !plainBack ? <SearchPanel onClose={close} /> : null}
    </header>
  )
}
