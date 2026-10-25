import type { CSSProperties, ReactNode } from 'react'

/** Loading shells. Every route has its own loading.tsx built from these, sized like the real page so nothing jumps.
 *  The shell only appears after 120 ms (CSS delay), so fast pages never flash it. */
export function SkPage({ children, wrap = true, label = 'Loading…' }: { children: ReactNode; wrap?: boolean; label?: string }) {
  return (
    <main className={`${wrap ? 'wrap ' : ''}sk-page`} aria-busy="true">
      <p className="visually-hidden" role="status">{label}</p>
      <div aria-hidden="true">{children}</div>
    </main>
  )
}

/** One shimmering block. Sizes are CSS values so the layout matches the real content. */
export function Sk({ w, h = 16, r, style, className = '' }: { w?: number | string; h?: number | string; r?: number | string; style?: CSSProperties; className?: string }) {
  return <span className={`skel sk ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />
}

export const SkCards = ({ n = 8 }: { n?: number }) => (
  <div className="grid sk-grid">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="sk-card"><Sk className="sk-photo" h="auto" /><Sk w="70%" h={20} /><Sk w="40%" h={14} /></div>
    ))}
  </div>
)

export const SkHead = ({ lines = 1 }: { lines?: number }) => (
  <div className="sk-head"><Sk w="min(320px, 70%)" h={44} />{lines > 1 ? <Sk w="min(480px, 90%)" h={18} /> : null}</div>
)

export const SkLines = ({ n = 3 }: { n?: number }) => (
  <div className="sk-lines">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="sk-line"><Sk className="sk-thumb" h="auto" /><div className="sk-col"><Sk w="60%" h={20} /><Sk w="35%" h={14} /></div><Sk w={72} h={24} /></div>
    ))}
  </div>
)

export const SkForm = ({ fields = 3 }: { fields?: number }) => (
  <div className="sk-form">
    {Array.from({ length: fields }, (_, i) => <div key={i}><Sk w={90} h={14} /><Sk h={48} style={{ marginTop: 8, display: 'block' }} /></div>)}
    <Sk h={52} />
  </div>
)

export const SkText = ({ n = 6 }: { n?: number }) => (
  <div className="sk-text">{Array.from({ length: n }, (_, i) => <Sk key={i} h={16} w={i % 3 === 2 ? '60%' : '100%'} />)}</div>
)

export const SkTable = ({ rows = 8 }: { rows?: number }) => (
  <div className="sk-table">{Array.from({ length: rows }, (_, i) => <div key={i} className="sk-row"><Sk w={90} h={18} /><Sk w="30%" h={18} /><Sk w={60} h={18} /><Sk w={80} h={26} /></div>)}</div>
)
