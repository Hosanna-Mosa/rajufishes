'use client'
import { useState } from 'react'
import { API } from '@/lib/api'
import { rupees } from '@/lib/format'

type Result = { ok: boolean; text: string }

export function PincodeCheck({ fresh = false, title, compact = false }: { fresh?: boolean; title?: string; compact?: boolean }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Result | null>(null)

  async function check(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(pin)) return setRes({ ok: false, text: 'Please type a 6 digit pincode.' })
    setBusy(true)
    try {
      const r = await fetch(`${API}/api/delivery/check?pincode=${pin}`)
      const d = await r.json()
      if (!r.ok || !d.deliverable) setRes({ ok: false, text: d.message || 'Sorry, we do not deliver to this pincode yet.' })
      else {
        const parts = [`Delivers in ${d.etaDays} days.`, d.charge === 0 ? 'Free delivery.' : `Delivery ${rupees(d.charge)}, free over ${rupees(d.freeOver)}.`]
        if (d.codAllowed) parts.push('Cash on delivery available.')
        if (fresh && d.freshAllowed === false && d.freshMessage) parts.push(d.freshMessage)
        setRes({ ok: true, text: parts.join(' ') })
      }
    } catch {
      setRes({ ok: false, text: 'We could not check right now. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const form = (
    <form onSubmit={check} noValidate>
      <label className="lbl" htmlFor={`pin-${compact ? 's' : 'p'}`}>{compact ? 'Your pincode' : title}</label>
      <div className="row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
        <input id={`pin-${compact ? 's' : 'p'}`} className="field" style={{ flex: '1 1 120px', width: 'auto' }} inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="6 digits" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        <button className={compact ? 'btn ghost' : 'btn'} disabled={busy}>{busy ? '…' : 'Check'}</button>
      </div>
      <p key={res?.text ?? ''} className={`msg ${res ? (res.ok ? 'good' : 'bad') : ''}`} role="status" style={{ margin: '10px 0 0' }}>
        {res ? res.text : compact ? '' : 'Delivery time and cash on delivery depend on your pincode.'}
      </p>
    </form>
  )

  return <div className={compact ? 'pin compact' : 'pin'}>{form}</div>
}
