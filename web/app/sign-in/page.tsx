import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getBusiness } from '@/lib/business'
import { SignInView } from '@/components/SignInView'

export const metadata: Metadata = { title: 'Sign in' }

export default async function SignInPage() {
  // phone sign in is switched off in guest mode: orders are found with the order number and phone
  if ((await getBusiness()).loginMode !== 'otp') redirect('/track')
  return (
    <main>
      <Suspense fallback={null}><SignInView/></Suspense>
    </main>
  )
}
