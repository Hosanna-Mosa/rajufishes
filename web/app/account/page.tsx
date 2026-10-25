import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getBusiness } from '@/lib/business'
import { AccountView } from '@/components/AccountView'

export const metadata: Metadata = { title: 'My account' }

export default async function AccountPage() {
  // phone sign in is switched off in guest mode: orders are found with the order number and phone
  if ((await getBusiness()).loginMode !== 'otp') redirect('/track')
  return <main><Suspense fallback={null}><AccountView/></Suspense></main>
}
