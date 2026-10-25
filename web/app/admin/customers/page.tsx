'use client'
import Link from 'next/link'
import { useState } from 'react'
import { acall, fmtDay } from '@/lib/admin'
import { Loading, PageHead, useLoad } from '@/components/admin/ui'
import { rupees } from '@/lib/format'

type C = { _id: string; name?: string; phone: string; createdAt: string; orders: number; spent: number; lastOrderAt: string | null }

export default function Customers() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { data, error } = useLoad(() => acall<{ items: C[]; total: number; pages: number }>(`/customers?${new URLSearchParams({ page: String(page), ...(q.trim() ? { q: q.trim() } : {}) })}`), [q, page])
  return (
    <>
      <PageHead title="Customers" sub="People who signed in with their phone number." />
      <div className="filters"><div className="fld grow"><label htmlFor="q">Search by name or phone</label><input id="q" className="field" value={q} onChange={(e) => { setPage(1); setQ(e.target.value) }} /></div></div>
      {!data ? <Loading error={error} /> : (
        <>
          <div className="tblw">
            <table className="tbl stack">
              <thead><tr><th>Name</th><th>Phone</th><th className="num">Orders</th><th className="num">Spent</th><th>Last order</th><th>Joined</th></tr></thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c._id}>
                    <td data-l="Name"><Link className="rowlink" href={`/admin/customers/${c._id}`}>{c.name || 'No name yet'}</Link></td>
                    <td data-l="Phone">{c.phone}</td>
                    <td data-l="Orders" className="num">{c.orders}</td>
                    <td data-l="Spent" className="num">{rupees(c.spent)}</td>
                    <td data-l="Last order">{c.lastOrderAt ? fmtDay(c.lastOrderAt) : '—'}</td>
                    <td data-l="Joined">{fmtDay(c.createdAt)}</td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={6} className="a-empty">No customers yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="btn sm line2" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span>Page {page} of {data.pages} · {data.total} customers</span>
            <button className="btn sm line2" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </>
      )}
    </>
  )
}
