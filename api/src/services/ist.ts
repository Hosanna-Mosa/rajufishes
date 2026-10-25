// The shop works in Indian Standard Time (UTC+5:30, no daylight saving). A "day" always means an IST calendar day.
const IST_MS = 5.5 * 60 * 60 * 1000

/** 'YYYY-MM-DD' of the IST calendar day this moment falls in. */
export const istDay = (d: Date | string | number = new Date()): string => new Date(new Date(d).getTime() + IST_MS).toISOString().slice(0, 10)

/** Whole IST days from `a` to `b` (0 = same IST day, 1 = b is the next day). */
export const istDaysBetween = (a: Date | string | number, b: Date | string | number = new Date()): number =>
  Math.round((Date.parse(istDay(b)) - Date.parse(istDay(a))) / 86_400_000)
