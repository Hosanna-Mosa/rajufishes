import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getBusiness } from '@/lib/business'
import { SiteProvider } from '@/components/SiteContext'
import { CartSync } from '@/components/CartSync'
import { ShopChrome } from '@/components/ShopChrome'
import { Suspense } from 'react'
import { RouteProgress } from '@/components/RouteProgress'
import { Toaster } from '@/components/Toaster'
import { Reveal } from '@/components/Reveal'
import '../styles/theme.css'
import './globals.css'

const head = Bricolage_Grotesque({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-bricolage', display: 'swap' })
const text = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-hanken', display: 'swap' })

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Raju Fishes: fresh off the boat', template: '%s | Raju Fishes' },
  description: 'Fresh fish from our own boats, plus dry and frozen packs, delivered all over India.',
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const biz = await getBusiness() // read here so the footer is part of the first render and does not pop in
  const messages = [`Free delivery over ${biz.b.freeOver}`, 'Cash on delivery available', 'Packed on ice', 'Landed today']
  return (
    <html lang="en" className={`${head.variable} ${text.variable}`}>
      <body>
        <Suspense fallback={null}><RouteProgress /></Suspense>
        <Toaster />
        <Reveal />
        <SiteProvider loginMode={biz.loginMode}>
          <ShopChrome><CartSync/><SiteHeader messages={messages} /></ShopChrome>
          {children}
          <ShopChrome><SiteFooter biz={biz} /></ShopChrome>
        </SiteProvider>
      </body>
    </html>
  )
}
