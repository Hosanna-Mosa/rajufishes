import Link from 'next/link'

export type TabItem = { label: string; href: string; on: boolean }

/** All / Fresh / Dry / Frozen as plain text tabs, underline on the active one. */
export function Tabs({ items, note }: { items: TabItem[]; note?: string }) {
  return (
    <div className="tabs">
      <nav aria-label="Categories">
        {items.map((t) => (
          <Link key={t.label} href={t.href} className={t.on ? 'on' : undefined} aria-current={t.on ? 'page' : undefined}>{t.label}</Link>
        ))}
      </nav>
      {note ? <span className="tabs-note">{note}</span> : null}
    </div>
  )
}
