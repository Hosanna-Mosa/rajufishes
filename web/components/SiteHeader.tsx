'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
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

/** Phone menu: a full height drawer from the left with big links. The current page has a blue underline. */
function Drawer({ onClose, mode }: { onClose: () => void; mode: string }) {
  const path = usePathname()
  const sp = useSearchParams()
  const c = useCustomer()
  const tab: TabKey | null = path === '/products' && !sp.get('q') ? tabFor(parseGroups(sp.get('group'))) : null
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [onClose])
  const cur = (on: boolean) => ({ className: on ? 'on' : undefined, 'aria-current': on ? ('page' as const) : undefined })
  return (
    <div className="drawer-wrap">
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" id="site-drawer" aria-label="Menu">
        <div className="drawer-top"><span className="logo">Raju Fishes</span><button ref={first} type="button" className="drawer-x" onClick={onClose} aria-label="Close menu">×</button></div>
        <nav aria-label="Menu links">
          <Link href="/products" {...cur(path === '/products' && tab === 'all')}>All products</Link>
          {TABS.filter((t) => t.key !== 'all').map((t) => <Link key={t.key} href={tabHref(t.key)} {...cur(tab === t.key)}>{t.label}</Link>)}
          <Link href="/about" {...cur(path === '/about')}>About</Link>
          <Link href="/track" {...cur(path === '/track')}>Track an order</Link>
          {mode !== 'guest' ? <Link href={c ? '/account' : '/sign-in'} {...cur(path.startsWith('/account') || path === '/sign-in' || path === '/sign-up')}>{c ? 'My account' : 'Sign in'}</Link> : null}
          <Link href="/cart" {...cur(path === '/cart')}>Cart</Link>
        </nav>
      </aside>
    </div>
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
  const [menu, setMenu] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const plainBack = path === '/checkout' ? ['/cart', '← Back to cart'] : ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'].includes(path) ? ['/products', '← Back to the shop'] : null

  useEffect(() => { setOpen(false); setMenu(false) }, [path])
  const closeMenu = useCallback(() => setMenu(false), [])
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
            <div className="hdr-l">
              <button type="button" className="menubtn" aria-label="Menu" aria-expanded={menu} aria-controls="site-drawer" onClick={() => setMenu(true)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
              </button>
              <Suspense fallback={<nav className="nav" aria-label="Main">{TABS.filter((t) => t.key !== 'all').map((t) => <Link key={t.key} href={tabHref(t.key)}>{t.label}</Link>)}<Link href="/about">About</Link></nav>}>
                <MainNav />
              </Suspense>
            </div>
            <Link href="/" className="logo">Raju Fishes</Link>
            <div className="nav right">
              <button ref={btn} type="button" className="navbtn" aria-expanded={open} aria-controls="site-search" aria-label="Search" onClick={() => (open ? close() : setOpen(true))}>
                <svg className="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
                <span className="t">Search</span>
              </button>
              {mode !== 'guest' && <span className="who"><Who path={path} /></span>}
              <CartLink on={path === '/cart'} />
            </div>
          </>
        )}
      </div>
      {menu && !plainBack ? <Suspense fallback={null}><Drawer onClose={closeMenu} mode={mode} /></Suspense> : null}
      {open && !plainBack ? <SearchPanel onClose={close} /> : null}
    </header>
  )
}
