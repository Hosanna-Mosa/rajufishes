import type { Metadata } from 'next'
import { Suspense } from 'react'
import { OrderView } from '@/components/OrderView'

export const metadata: Metadata = { title: 'Your order', robots: { index: false } }

export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params
  return (
    <main>
      <div className="wrap">
        <div className="banner"><h1>Your order</h1><p className="sub">Order #{orderNo}</p></div>
      </div>
      <Suspense fallback={<div className="wrap" style={{ padding: 56 }}>Loading…</div>}><OrderView orderNo={orderNo} /></Suspense>
    </main>
  )
}
