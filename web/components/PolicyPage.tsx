import type { ReactNode } from 'react'
import { getContact, type Contact } from '@/lib/api'
import { Stripes } from './Stripes'

export type Fill = { name: string; address: string; phone: string; email: string }

/** Business details from Admin > Delivery. Anything not filled in yet shows as a [BRACKET] so it is easy to spot and fix. */
export async function businessFill(): Promise<{ fill: Fill; contact: Contact | null }> {
  const c = await getContact()
  return {
    contact: c,
    fill: {
      name: c?.businessName || '[BUSINESS NAME]',
      address: c?.address || '[ADDRESS]',
      phone: c?.phone || '[PHONE]',
      email: c?.email || '[EMAIL]',
    },
  }
}

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main>
      <div className="banner">
        <div className="wrap">
          <div className="crumb">Home / {title}</div>
          <h1 className="st">{title}</h1>
          <p className="sub">{intro}</p>
        </div>
        <Stripes />
      </div>
      <div className="wrap policy">{children}</div>
    </main>
  )
}
