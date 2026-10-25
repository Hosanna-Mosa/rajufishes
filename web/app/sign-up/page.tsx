import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getBusiness } from '@/lib/business'
import { AuthForm } from '@/components/AuthForm'

export const metadata: Metadata = { title: 'Sign up', robots: { index: false } }

export default async function Page() {
  if ((await getBusiness()).loginMode !== 'account') redirect('/track')
  return <main><Suspense fallback={null}><AuthForm mode="signup" /></Suspense></main>
}
