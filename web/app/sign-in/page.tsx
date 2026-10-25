import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignInView } from '@/components/SignInView'

export const metadata: Metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <main>
      <Suspense fallback={null}><SignInView /></Suspense>
    </main>
  )
}
