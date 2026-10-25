import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AccountView } from '@/components/AccountView'

export const metadata: Metadata = { title: 'My account' }

export default function AccountPage() {
  return <main><Suspense fallback={null}><AccountView /></Suspense></main>
}
