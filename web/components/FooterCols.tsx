'use client'
import Link from 'next/link'
import { useState } from 'react'

const COLS: { title: string; links: [string, string][] }[] = [
  { title: 'Shop', links: [['Fresh', '/products?group=Fresh+fish,Prawns+and+crab'], ['Dry', '/products?group=Dry+fish'], ['Frozen', '/products?group=Frozen+packs'], ['Track order', '/track']] },
  { title: 'Company', links: [['About', '/about'], ['Contact', '/contact'], ['Shipping', '/shipping'], ['Cart', '/cart']] },
  { title: 'Policies', links: [['Refunds', '/refunds'], ['Privacy', '/privacy'], ['Terms', '/terms']] },
]

/** Three link columns. Side by side on a laptop; stacked as accordions on a phone (the headings are buttons only there). */
export function FooterCols() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="ftr-cols">
      {COLS.map((c) => (
        <div key={c.title} className={`ftr-col${open === c.title ? ' open' : ''}`}>
          <button type="button" className="ftr-h" aria-expanded={open === c.title} onClick={() => setOpen(open === c.title ? null : c.title)}>
            {c.title}<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <nav aria-label={c.title}>{c.links.map(([l, h]) => <Link key={h} href={h}>{l}</Link>)}</nav>
        </div>
      ))}
    </div>
  )
}
