export interface ZoneLike {
  _id?: unknown
  name: string
  match?: { pincodes?: string[]; pincodePrefixes?: string[]; states?: string[] } | null
  isDefault?: boolean | null
  charge: number
  freeOver: number
  minOrder?: number | null
  etaDays?: number | null
  codAllowed?: boolean | null
  freshAllowed?: boolean | null
  active?: boolean | null
}

export const isPincode = (p: string) => /^[1-9]\d{5}$/.test(p)

/**
 * Pincode to zone. First hit wins:
 * 1. exact pincode, 2. longest pincode prefix (5, 4, then 3 digits), 3. state, 4. the default zone.
 */
export function matchZone<Z extends ZoneLike>(zones: Z[], pincode: string, state?: string): Z | null {
  const live = zones.filter((z) => z.active !== false)
  const exact = live.find((z) => z.match?.pincodes?.includes(pincode))
  if (exact) return exact
  let best: Z | null = null
  let bestLen = 0
  for (const z of live) {
    for (const prefix of z.match?.pincodePrefixes ?? []) {
      if (prefix.length > bestLen && pincode.startsWith(prefix)) {
        best = z
        bestLen = prefix.length
      }
    }
  }
  if (best) return best
  if (state) {
    const s = state.trim().toLowerCase()
    const byState = live.find((z) => z.match?.states?.some((x) => x.toLowerCase() === s))
    if (byState) return byState
  }
  return live.find((z) => z.isDefault) ?? null
}

/** Free when the subtotal (before any coupon) reaches freeOver. */
export function deliveryCharge(zone: Pick<ZoneLike, 'charge' | 'freeOver'>, subtotal: number): number {
  return subtotal >= zone.freeOver ? 0 : zone.charge
}
