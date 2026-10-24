import type { Metadata, Viewport } from 'next'
import { Archivo, Big_Shoulders_Stencil } from 'next/font/google'
import './globals.css'

const display = Big_Shoulders_Stencil({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-display' })
const body = Archivo({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Raju Fishes',
  description: 'Fresh, dry and frozen fish from our own boats, delivered to your door.',
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
