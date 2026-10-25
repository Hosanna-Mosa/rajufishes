'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { acall, type AdminUser } from '@/lib/admin'
import { ApiError } from '@/lib/client'

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
      <div className="adm">
        <div className="topbar" />
        <div className="a-wrap">
          <aside className="a-side">
            <Link href="/admin" className="a-logo st">Raju Fishes<small>Shop admin</small></Link>
            <nav aria-label="Admin" className="a-nav st">
              {NAV.filter((n) => !n.owner || me.role === 'owner').map((n) => {
                const on = n.href === '/admin' ? path === '/admin' : path === n.href || path.startsWith(n.href + '/')
                return <Link key={n.href} href={n.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>{n.label}</Link>
              })}
            </nav>
            <div className="a-me small">
              <b>{me.email}</b>
              <span>{me.role === 'owner' ? 'Owner' : 'Staff'} login</span>
              <Link href="/" target="_blank" className="a-lnk">Open the shop ↗</Link>
              <button type="button" className="a-lnk" onClick={signOut}>Sign out</button>
            </div>
          </aside>
          <main className="a-main">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  )
}
