/** Returns a 10 digit Indian mobile number, or null if it is not valid. Accepts +91, 91 and 0 prefixes. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[\s()-]/g, '')
  if (d.startsWith('+91')) d = d.slice(3)
  else if (d.startsWith('91') && d.length === 12) d = d.slice(2)
  else if (d.startsWith('0') && d.length === 11) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? d : null
}
export const maskPhone = (p: string) => `${p.slice(0, 2)}XXXXXX${p.slice(-2)}`
