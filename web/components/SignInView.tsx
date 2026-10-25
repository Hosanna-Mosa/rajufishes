'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ApiError, call } from '@/lib/client'
import { signedIn, useCustomer, type Customer } from '@/lib/session'

export function SignInView() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next')?.startsWith('/') && !sp.get('next')?.startsWith('//') ? sp.get('next')! : '/account'
  const customer = useCustomer()
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { if (customer) router.replace(next) }, [customer, next, router])

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const p = phone.replace(/\D/g, '').slice(-10)
    if (p.length !== 10) return setMsg('Enter your 10 digit mobile number.')
    setBusy(true); setMsg('')
    try {
      await call('/auth/otp/send', { method: 'POST', body: { phone: p } })
      setSent(true); setDigits(['', '', '', '', '', '']); setTimeout(() => refs.current[0]?.focus(), 50)
    } catch (err) { setMsg(err instanceof ApiError ? err.message : 'Could not send the code.') }
    finally { setBusy(false) }
  }

  function typeDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '')
    if (d.length > 1) { // pasted code
      const all = d.slice(0, 6).split('')
      setDigits(Array.from({ length: 6 }, (_, k) => all[k] ?? ''))
      refs.current[Math.min(all.length, 5)]?.focus()
      return
    }
    setDigits((p) => p.map((x, k) => (k === i ? d : x)))
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length !== 6) return setMsg('Enter all 6 digits of the code.')
    setBusy(true); setMsg('')
    try {
      const r = await call<{ customer: Customer }>('/auth/otp/verify', { method: 'POST', body: { phone: phone.replace(/\D/g, '').slice(-10), code } })
      await signedIn(r.customer)
      router.replace(next)
    } catch (err) { setMsg(err instanceof ApiError ? err.message : 'That code did not work.'); setBusy(false) }
  }

  return (
    <div className="sign">
      <div className="sign-l">
        <div className="kick st">Welcome back</div>
        <h1 className="st">Sign in<br />to order.</h1>
        <p>No password to remember. We send a code to your mobile number.</p>
        <div className="bands"><i style={{ background: 'var(--white)' }} /><i style={{ background: 'var(--red)' }} /></div>
      </div>
      <div className="sign-r">
        <div className="sum">
          <div className="sum-h st">Sign in with your phone</div>
          <div className="sign-b">
            <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="lab" htmlFor="ph">Mobile number</label>
                <div className="phonerow"><b className="st">+91</b><input id="ph" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10 digits" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
              </div>
              <button className="dark st" disabled={busy}>{sent ? 'Send code again' : 'Send code'}</button>
            </form>
            {sent ? (
              <form className="otp" onSubmit={verify}>
                <div className="lab" style={{ margin: 0 }}>Enter the 6-digit code</div>
                <div className="otpbox">
                  {digits.map((d, i) => (
                    <input key={i} ref={(el) => { refs.current[i] = el }} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`}
                      onChange={(e) => typeDigit(i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus() }} />
                  ))}
                </div>
                <p className="small" style={{ margin: 0 }}>Did not get it? <button type="button" className="linkbtn" onClick={() => send()}>Send again</button></p>
                <button className="red st" disabled={busy}>Verify and continue</button>
              </form>
            ) : null}
            {msg ? <div className="bad-t" role="alert">{msg}</div> : null}
            <p className="small" style={{ margin: 0 }}>Continue without an account? <Link href="/checkout" style={{ textDecoration: 'underline', fontWeight: 700 }}>Check out as a guest</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
