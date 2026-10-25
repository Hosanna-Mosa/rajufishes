'use client'
import { useState } from 'react'
import { acall, fmtDateTime } from '@/lib/admin'
import { errText, Loading, Notice, PageHead, Pill, useLoad } from '@/components/admin/ui'
import { useAdminUser } from '@/components/admin/AdminShell'

type U = { id: string; email: string; name: string; role: 'owner' | 'staff'; lastLoginAt: string | null }

export default function Staff() {
  const me = useAdminUser()
  const { data, error, reload } = useLoad(() => acall<{ items: U[] }>('/staff'))
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)
  const [add, setAdd] = useState({ name: '', email: '', password: '' })
  const [pw, setPw] = useState<{ id: string; password: string } | null>(null)
  const [mine, setMine] = useState({ current: '', next: '' })
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<unknown>, ok: string, after?: () => void) {
    setBusy(true); setMsg(null)
    try { await fn(); after?.(); await reload(); setMsg({ kind: 'ok', text: ok }) } catch (e) { setMsg({ kind: 'bad', text: errText(e) }) }
    setBusy(false)
  }
  if (!data) return <Loading error={error} />
  return (
    <>
      <PageHead title="Staff" sub="People who can sign in to this admin. Staff can run orders, products and the market board, but not delivery, coupons or this page." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="tblw">
        <table className="tbl stack">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign in</th><th/></tr></thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id}>
                <td data-l="Name"><b>{u.name}</b></td>
                <td data-l="Email">{u.email}</td>
                <td data-l="Role"><Pill tone={u.role === 'owner' ? 'yellow' : 'blue'}>{u.role === 'owner' ? 'Owner' : 'Staff'}</Pill></td>
                <td data-l="Last sign in">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}</td>
                <td className="nolab">
                  {pw?.id === u.id ? (
                    <div className="btnrow" style={{ justifyContent: 'flex-end' }}>
                      <input className="field" style={{ width: 200 }} type="password" autoComplete="new-password" placeholder="New password (10+ characters)" aria-label={`New password for ${u.name}`} value={pw.password} onChange={(e) => setPw({ id: u.id, password: e.target.value })} />
                      <button className="btn sm" disabled={busy || pw.password.length < 10} onClick={() => run(() => acall(`/staff/${u.id}/password`, { method: 'PATCH', body: { password: pw.password } }), `Password changed for ${u.name}.`, () => setPw(null))}>Save</button>
                      <button className="btn sm line2" onClick={() => setPw(null)}>Cancel</button>
                    </div>
                  ) : u.role === 'staff' ? (
                    <div className="btnrow" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn sm line2" onClick={() => setPw({ id: u.id, password: '' })}>Change password</button>
                      <button className="btn sm red" disabled={busy} onClick={() => confirm(`Remove ${u.name}? They will not be able to sign in again.`) && run(() => acall(`/staff/${u.id}`, { method: 'DELETE' }), `${u.name} was removed.`)}>Remove</button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rowsplit" style={{ marginTop: 28 }}>
        <form className="main a-card" onSubmit={(e) => { e.preventDefault(); void run(() => acall('/staff', { method: 'POST', body: add }), `${add.name} can now sign in.`, () => setAdd({ name: '', email: '', password: '' })) }}>
          <h2>Add a staff login</h2>
          <div className="in fgrid">
            <div className="fld h2"><label htmlFor="sn">Name</label><input id="sn" className="field" value={add.name} maxLength={80} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></div>
            <div className="fld h2"><label htmlFor="se">Email</label><input id="se" className="field" type="email" autoComplete="off" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} /></div>
            <div className="fld"><label htmlFor="sp">Password (at least 10 characters)</label><input id="sp" className="field" type="password" autoComplete="new-password" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} /><div className="hint">Tell them the password in person. They can sign in right away.</div></div>
            <button className="btn" disabled={busy || !add.name.trim() || !add.email || add.password.length < 10}>Add staff login</button>
          </div>
        </form>
        <form className="side a-card" onSubmit={(e) => { e.preventDefault(); void run(() => acall('/auth/password', { method: 'POST', body: mine }), 'Your password was changed.', () => setMine({ current: '', next: '' })) }}>
          <h2>Your own password</h2>
          <div className="in fgrid">
            <p className="small" style={{ margin: 0 }}>Signed in as {me.email}</p>
            <div className="fld"><label htmlFor="mc">Current password</label><input id="mc" className="field" type="password" autoComplete="current-password" value={mine.current} onChange={(e) => setMine({ ...mine, current: e.target.value })} /></div>
            <div className="fld"><label htmlFor="mn">New password (at least 10 characters)</label><input id="mn" className="field" type="password" autoComplete="new-password" value={mine.next} onChange={(e) => setMine({ ...mine, next: e.target.value })} /></div>
            <button className="btn" disabled={busy || !mine.current || mine.next.length < 10}>Change my password</button>
          </div>
        </form>
      </div>
    </>
  )
}
