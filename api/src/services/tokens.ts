import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type CustomerClaims = { sub: string; typ: 'customer' }
export type AdminClaims = { sub: string; typ: 'admin'; role: 'owner' | 'staff' }

export const signCustomer = (id: string) => jwt.sign({ sub: id, typ: 'customer' } satisfies CustomerClaims, env.CUSTOMER_JWT_SECRET, { expiresIn: '30d' })
export const signAdmin = (id: string, role: 'owner' | 'staff') => jwt.sign({ sub: id, typ: 'admin', role } satisfies AdminClaims, env.ADMIN_JWT_SECRET, { expiresIn: '8h' })

export function verifyCustomer(token: string): CustomerClaims | null {
  try {
    const c = jwt.verify(token, env.CUSTOMER_JWT_SECRET) as CustomerClaims
    return c.typ === 'customer' ? c : null
  } catch { return null }
}
export function verifyAdmin(token: string): AdminClaims | null {
  try {
    const c = jwt.verify(token, env.ADMIN_JWT_SECRET) as AdminClaims
    return c.typ === 'admin' ? c : null
  } catch { return null }
}

/** Private link token for guest order tracking. */
export const signTrack = (orderNo: string) => jwt.sign({ orderNo, typ: 'track' }, env.CUSTOMER_JWT_SECRET, { expiresIn: '365d' })
export function verifyTrack(token: string, orderNo: string): boolean {
  try {
    const c = jwt.verify(token, env.CUSTOMER_JWT_SECRET) as { orderNo?: string; typ?: string }
    return c.typ === 'track' && c.orderNo === orderNo
  } catch { return false }
}
