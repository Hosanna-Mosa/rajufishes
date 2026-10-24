import type { Metadata, Viewport } from 'next'
import { Archivo, Big_Shoulders_Stencil } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import './globals.css'

// The design's "Big Shoulders Stencil Display" is published as "Big Shoulders Stencil" in Google Fonts.
const display = Big_Shoulders_Stencil({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-display', display: 'swap' })
const body = Archivo({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body', display: 'swap' })

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Raju Fishes: fresh off the boat', template: '%s | Raju Fishes' },
  description: 'Fresh fish from our own boats, plus dry and frozen packs, delivered all over India.',
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
