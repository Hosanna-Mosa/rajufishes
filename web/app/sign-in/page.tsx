import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getBusiness } from '@/lib/business'
import { SignInView } from '@/components/SignInView'
import { AuthForm } from '@/components/AuthForm'

export const metadata: Metadata = { title: 'Sign in' }

export default async function SignInPage() {
  const mode = (await getBusiness()).loginMode
  if (mode === 'guest') redirect('/track') // no sign in in guest mode: orders are found with the order number and phone
  return <main><Suspense fallback={null}>{mode === 'otp' ? <SignInView /> : <AuthForm mode="signin" />}</Suspense></main>
}
