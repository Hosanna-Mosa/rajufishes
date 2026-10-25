// All the wording of the fresh-day line lives here. Days are Indian Standard Time (UTC+5:30) days.
// Change the sentences below and every card, product page, cart line, search result and order picks them up.

const IST_MS = 5.5 * 60 * 60 * 1000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** After this many days the line shows dates instead of "N days ago". */
const SHOW_DATE_AFTER_DAYS = 7

const istDay = (d: Date | string | number) => new Date(new Date(d).getTime() + IST_MS).toISOString().slice(0, 10)
const daysAgo = (d: string | Date, now: Date) => Math.round((Date.parse(istDay(now)) - Date.parse(istDay(d))) / 86_400_000)
/** "25 Oct" */
export const shortDate = (d: string | Date) => { const [, m, day] = istDay(d).split('-'); return `${Number(day)} ${MONTHS[Number(m) - 1]}` }

const when = (n: number) => (n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`)

export type FreshLine = { text: string; chip: string; today: boolean }

/**
 * The fresh-day line for one fresh product.
 * `caughtOn` / `addedOn` are the saved dates. `now` is the moment to count from (the order time, for orders).
 * No caught date means no line: a date is never made up.
 */
export function freshLine(
  p: { category?: string; caughtOn?: string | Date | null; addedOn?: string | Date | null },
  now: Date = new Date(),
): FreshLine | null {
  if (p.category && p.category !== 'fresh') return null
  if (!p.caughtOn) return null
  const c = daysAgo(p.caughtOn, now)
  const a = p.addedOn ? daysAgo(p.addedOn, now) : null
  const old = c > SHOW_DATE_AFTER_DAYS || (a !== null && a > SHOW_DATE_AFTER_DAYS)
  const caught = old ? `Caught ${shortDate(p.caughtOn)}` : `Caught ${when(c)}`
  const added = a === null ? '' : old ? `, added ${shortDate(p.addedOn as string | Date)}` : `, added ${when(a)}`
  return { text: `${caught}${added}.`, chip: shortDate(p.caughtOn), today: c <= 0 }
}
