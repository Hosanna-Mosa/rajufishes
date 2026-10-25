'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { acall, type AdminUser } from '@/lib/admin'
import { ApiError } from '@/lib/client'
import { AlertsProvider, SoundBar, useAlerts } from './Alerts'

const Ctx = createContext<AdminUser | null>(null)
export const useAdminUser = () => useContext(Ctx)!

const NAV: { href: string; label: string; owner?: boolean }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/market', label: 'Market board' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/delivery', label: 'Delivery', owner: true },
  { href: '/admin/coupons', label: 'Coupons', owner: true },
  { href: '/admin/staff', label: 'Staff', owner: true },
]

/** Orders menu item with the count of new orders. Opening an order marks it as seen. */
function Nav({ me, path }: { me: AdminUser; path: string }) {
  const { count, opened } = useAlerts()
  const m = path.match(/^\/admin\/orders\/([a-f0-9]{24})$/)
  const id = m?.[1]
  useEffect(() => { if (id) opened(id) }, [id, opened])
  return (
    <nav aria-label="Admin" className="a-nav">
      {NAV.filter((n) => !n.owner || me.role === 'owner').map((n) => {
        const on = n.href === '/admin' ? path === '/admin' : path === n.href || path.startsWith(n.href + '/')
        return (
          <Link key={n.href} href={n.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
            {n.label}
            {n.href === '/admin/orders' && count > 0 && <span key={count} className="a-badge pop" aria-label={`${count} new orders`}>{count}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

/** Sign in check, side menu and the page area. The sign in page and the print page skip the menu. */
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<AdminUser | null>(null)
  const bare = path === '/admin/login'
  const printing = path.endsWith('/slip') || path.endsWith('/picklist')

  useEffect(() => {
    if (bare) return
    acall<{ admin: AdminUser & { _id?: string } }>('/auth/me')
      .then((r) => setMe({ id: r.admin.id ?? r.admin._id ?? '', email: r.admin.email, name: r.admin.name, role: r.admin.role }))
      .catch((e) => { if (e instanceof ApiError && e.status === 401) router.replace('/admin/login') })
  }, [bare, router])

  if (bare) return <div className="adm adm-bare">{children}</div>
  if (!me) return <div className="adm adm-bare"><p className="small" style={{ padding: 24 }}>Loading…</p></div>

  // staff typing the address of an owner-only page get sent back instead of seeing errors
  const ownerOnly = NAV.find((n) => n.owner && (path === n.href || path.startsWith(n.href + '/')))
  if (me.role === 'staff' && ownerOnly) {
    return <div className="adm adm-bare"><div className="a-note bad" style={{ margin: 24 }}>This page is for the owner only. <Link href="/admin"><u>Back to the dashboard</u></Link></div></div>
  }
  if (printing) return <div className="adm">{children}</div>

  const signOut = async () => { await acall('/auth/logout', { method: 'POST', body: {} }).catch(() => {}); router.replace('/admin/login') }
  return (
    <Ctx.Provider value={me}>
      <AlertsProvider>
      <div className="adm">
        <div className="topbar" />
        <div className="a-wrap">
          <aside className="a-side">
            <Link href="/admin" className="a-logo">Raju Fishes<small>Shop admin</small></Link>
            <Nav me={me} path={path} />
            <div className="a-me small">
              <b>{me.email}</b>
              <span>{me.role === 'owner' ? 'Owner' : 'Staff'} login</span>
              <button type="button" className="a-lnk" onClick={signOut}>Sign out</button>
              <Link href="/" target="_blank" className="a-lnk">Open the shop ↗</Link>
            </div>
          </aside>
          <main className="a-main"><SoundBar/>{children}</main>
        </div>
      </div>
      </AlertsProvider>
    </Ctx.Provider>
  )
}
