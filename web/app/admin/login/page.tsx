'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { acall } from '@/lib/admin'
import { errText, Notice } from '@/components/admin/ui'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      await acall('/auth/login', { method: 'POST', body: { email: email.trim(), password } })
      router.replace('/admin')
    } catch (x) {
      setErr(errText(x)); setBusy(false)
    }
  }
  return (
    <div className="a-login">
      <div className="tag st">Staff only</div>
      <h1 className="st">Raju Fishes<br />shop admin</h1>
      <form className="a-card" onSubmit={submit} noValidate>
        <h2 className="st">Sign in</h2>
        <div className="in fgrid">
          {err && <Notice kind="bad">{err}</Notice>}
          <div className="fld">
            <label htmlFor="em">Email</label>
            <input id="em" className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="fld">
            <label htmlFor="pw">Password</label>
            <input id="pw" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn yellow big" type="submit" disabled={busy || !email || !password} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
