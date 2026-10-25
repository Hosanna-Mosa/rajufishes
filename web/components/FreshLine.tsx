import { freshLine } from '@/lib/freshLabel'

type Dates = { category?: string; caughtOn?: string | Date | null; addedOn?: string | Date | null }

/** "Caught today, added today." with a small date chip. Renders nothing for dry and frozen items or when no caught date is saved. */
export function FreshLine({ p, now, size = 'sm' }: { p: Dates; now?: Date; size?: 'sm' | 'page' }) {
  const f = freshLine(p, now)
  if (!f) return null
  return (
    <p className={`fresh-line ${size}`}>
      <span className="fresh-txt">{f.today ? <i className="fresh-dot" aria-hidden="true" /> : null}{f.text}</span>
      <span className="fresh-chip">{f.chip}</span>
    </p>
  )
}
