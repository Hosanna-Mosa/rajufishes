import type { Metadata, Viewport } from 'next'
import { Archivo, Big_Shoulders_Stencil } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getContact } from '@/lib/api'
import { CartSync } from '@/components/CartSync'
import { ShopChrome } from '@/components/ShopChrome'
import './globals.css'

// The design's "Big Shoulders Stencil Display" is published as "Big Shoulders Stencil" in Google Fonts.
const display = Big_Shoulders_Stencil({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-display', display: 'optional' })
const body = Archivo({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body', display: 'swap' })

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Raju Fishes: fresh off the boat', template: '%s | Raju Fishes' },
  description: 'Fresh fish from our own boats, plus dry and frozen packs, delivered all over India.',
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const contact = await getContact() // read here so the footer is part of the first render and does not pop in
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ShopChrome><CartSync /><SiteHeader /></ShopChrome>
        {children}
        <ShopChrome><SiteFooter c={contact} /></ShopChrome>
      </body>
    </html>
  )
}
