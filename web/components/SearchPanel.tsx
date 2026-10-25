'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/lib/api'
import { call } from '@/lib/client'
import { FreshLine } from './FreshLine'
import { CATEGORY_LABEL, priceText } from '@/lib/format'
import { LineThumb } from './LineThumb'
import { trackSearch } from '@/lib/analytics'

const SHOWN = 6

/** Full width panel under the header: a text box and live results after two letters. Esc closes it. */
export function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const box = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [found, setFound] = useState<{ q: string; items: Product[]; total: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const q = text.trim()

  useEffect(() => { box.current?.focus() }, [])

  useEffect(() => {
    if (q.length < 2) { setFound(null); setFailed(false); return }
    let stale = false
    const t = setTimeout(() => {
      call<{ items: Product[]; total: number }>(`/products?q=${encodeURIComponent(q)}&limit=${SHOWN}`)
        .then((r) => { if (!stale) { trackSearch(q); setFound({ q, items: r.items, total: r.total }); setFailed(false) } })
        .catch(() => { if (!stale) setFailed(true) })
    }, 250)
    return () => { stale = true; clearTimeout(t) }
  }, [q])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (q.length < 2) return
    router.push(`/products?q=${encodeURIComponent(q)}`)
    onClose()
  }

  const current = found && found.q === q ? found : null
  return (
    <div className="search" id="site-search" role="search" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
      <div className="wrap search-in">
        <form onSubmit={submit} className="search-form">
          <label htmlFor="search-box" className="lbl">Search the catch</label>
          <input id="search-box" ref={box} className="search-box" type="search" autoComplete="off" placeholder="Pomfret, prawns, dry anchovies…" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} />
        </form>
        <button type="button" className="search-x" onClick={onClose} aria-label="Close search">Close</button>
        <div className="search-res" aria-live="polite">
          {failed ? <p className="search-none">Search is not available right now. Please try again.</p> : null}
          {!failed && q.length >= 2 && current && current.items.length === 0 ? <p className="search-none">Nothing found for “{q}”.</p> : null}
          {!failed && current && current.items.length > 0 ? (
            <>
              <ul>
                {current.items.map((p) => (
                  <li key={p._id}>
                    <Link href={`/products/${p.slug}`} className="search-hit" onClick={onClose}>
                      <LineThumb image={p.images[0]?.url} name={p.name} category={p.category} />
                      <span className="search-nm">{p.name}<small>{CATEGORY_LABEL[p.category]}</small><FreshLine p={p} /></span>
                      <span className="search-pr">{p.available ? priceText(p) : 'Sold out today'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {current.total > SHOWN ? <Link href={`/products?q=${encodeURIComponent(q)}`} className="textlink" onClick={onClose}>See all {current.total} results</Link> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
