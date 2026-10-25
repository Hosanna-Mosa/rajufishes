'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ApiError, call } from '@/lib/client'
import { trackLogin, trackSignUp } from '@/lib/analytics'
import { signedIn, useCustomer, type Customer } from '@/lib/session'
import { Label, ReqNote } from './Label'

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset'

const COPY: Record<AuthMode, { h1: string; lead: string; box: string; go: string }> = {
  signin: { h1: 'Welcome back.', lead: 'Sign in to see your orders and save time at checkout.', box: 'Sign in', go: 'Sign in' },
  signup: { h1: 'Create your account.', lead: 'Keep your orders and addresses in one place. You can still check out as a guest any time.', box: 'Sign up', go: 'Create account' },
  forgot: { h1: 'Forgot your password?', lead: 'Enter your email and we will send a link to choose a new one.', box: 'Reset your password', go: 'Send reset link' },
  reset: { h1: 'Choose a new password.', lead: 'The link in your email works once and lasts 30 minutes.', box: 'New password', go: 'Save new password' },
}

/** A hint, not a rule: the server only needs 8 characters with a letter and a number. */
export function strength(p: string): { label: string; level: 0 | 1 | 2 | 3 } {
  if (!p) return { label: '', level: 0 }
  const ok = p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p)
  if (!ok) return { label: 'Weak: use 8 or more characters with letters and a number', level: 1 }
  if (p.length >= 12 || /[^a-zA-Z0-9]/.test(p)) return { label: 'Strong', level: 3 }
  return { label: 'Good. A longer password is stronger', level: 2 }
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const sp = useSearchParams()
  const raw = sp.get('next')
  const next = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/account'
  const token = sp.get('token') ?? ''
  const customer = useCustomer()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const c = COPY[mode]
  const s = strength(f.password)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  useEffect(() => { if (customer && mode !== 'reset' && !busy) router.replace(next) }, [customer, mode, next, router, busy])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    if (mode === 'signup' || mode === 'reset') {
      if (f.password.length < 8) return setMsg('Use at least 8 characters for the password.')
      if (f.password !== f.confirm) return setMsg('The two passwords do not match.')
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const r = await call<{ customer: Customer }>('/auth/login', { method: 'POST', body: { email: f.email.trim(), password: f.password } })
        trackLogin('email'); await signedIn(r.customer); router.replace(next)
      } else if (mode === 'signup') {
        const r = await call<{ customer: Customer }>('/auth/signup', { method: 'POST', body: { name: f.name.trim(), email: f.email.trim(), password: f.password, confirm: f.confirm } })
        trackSignUp('email'); await signedIn(r.customer); router.replace(next)
      } else if (mode === 'forgot') {
        const r = await call<{ message: string }>('/auth/forgot', { method: 'POST', body: { email: f.email.trim() } })
        setDone(r.message); setBusy(false)
      } else {
        await call('/auth/reset', { method: 'POST', body: { token, password: f.password, confirm: f.confirm } })
        setDone('Your password is changed. You can sign in now.'); setBusy(false)
      }
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const missingToken = mode === 'reset' && !token
  return (
    <div className="sign">
      <div className="sign-l">
        <h1>{c.h1}</h1>
        <p>{c.lead}</p>
      </div>
      <div className="sign-r">
        <div className="sum">
          <h2 className="sum-h">{c.box}</h2>
          <div className="sign-b">
            {done ? (
              <>
                <p className="good-t" role="status" style={{ margin: 0 }}>{done}</p>
                {mode === 'reset' ? <Link href="/sign-in" className="btn">Go to sign in</Link> : <Link href="/sign-in" className="textlink">Back to sign in</Link>}
              </>
            ) : missingToken ? (
              <>
                <p className="bad-t" role="alert" style={{ margin: 0 }}>This reset link is not complete. Please ask for a new one.</p>
                <Link href="/forgot-password" className="btn">Send a new link</Link>
              </>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
                <ReqNote />
                {mode === 'signup' && (
                  <div><Label className="lab" htmlFor="au-name" req>Your name</Label>
                    <input id="au-name" className="field" autoComplete="name" required aria-required maxLength={80} value={f.name} onChange={set('name')} /></div>
                )}
                {mode !== 'reset' && (
                  <div><Label className="lab" htmlFor="au-email" req>Email</Label>
                    <input id="au-email" className="field" type="email" autoComplete="email" required aria-required maxLength={120} value={f.email} onChange={set('email')} /></div>
                )}
                {mode !== 'forgot' && (
                  <div><Label className="lab" htmlFor="au-pass" req>{mode === 'reset' ? 'New password' : 'Password'}</Label>
                    <input id="au-pass" className="field" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required aria-required maxLength={72} value={f.password} onChange={set('password')} aria-describedby={mode !== 'signin' ? 'au-hint' : undefined} />
                    {mode !== 'signin' && <p id="au-hint" className={`pw-hint l${s.level}`} aria-live="polite">{s.label || 'At least 8 characters, with letters and a number.'}</p>}
                  </div>
                )}
                {(mode === 'signup' || mode === 'reset') && (
                  <div><Label className="lab" htmlFor="au-confirm" req>Confirm password</Label>
                    <input id="au-confirm" className="field" type="password" autoComplete="new-password" required aria-required maxLength={72} value={f.confirm} onChange={set('confirm')} aria-invalid={!!f.confirm && f.confirm !== f.password} /></div>
                )}
                {msg ? <div className="bad-t" role="alert">{msg}</div> : null}
                <button className="btn" disabled={busy}>{busy ? 'One moment…' : c.go}</button>
                {mode === 'signin' && <p className="small" style={{ margin: 0 }}><Link href="/forgot-password" className="textlink">Forgot your password?</Link></p>}
              </form>
            )}
            {mode === 'signin' && <p className="small" style={{ margin: 0 }}>New here? <Link href="/sign-up" style={{ textDecoration: 'underline', fontWeight: 700 }}>Create an account</Link></p>}
            {mode === 'signup' && <p className="small" style={{ margin: 0 }}>Already have an account? <Link href="/sign-in" style={{ textDecoration: 'underline', fontWeight: 700 }}>Sign in</Link></p>}
            {(mode === 'signin' || mode === 'signup') && <p className="small" style={{ margin: 0 }}>Continue without an account? <Link href="/checkout" style={{ textDecoration: 'underline', fontWeight: 700 }}>Check out as a guest</Link></p>}
          </div>
        </div>
      </div>
    </div>
  )
}
