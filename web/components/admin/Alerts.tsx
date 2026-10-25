'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { acall } from '@/lib/admin'
import { rupees } from '@/lib/format'

type Alert = { _id: string; orderNo: string; total: number; contact?: { name?: string } }
type Ctx = { count: number; tick: number; muted: boolean; soundOn: boolean; toggleMute: () => void; turnOnSound: () => void; opened: (id: string) => void }
const AlertsCtx = createContext<Ctx>({ count: 0, tick: 0, muted: false, soundOn: false, toggleMute: () => {}, turnOnSound: () => {}, opened: () => {} })
export const useAlerts = () => useContext(AlertsCtx)

export const POLL_MS = 20_000
const TITLE = 'Raju Fishes Admin'
const MUTE_KEY = 'adm-muted'
const OPENED_KEY = 'adm-opened'

const store = {
  get(k: string) { try { return localStorage.getItem(k) } catch { return null } },
  set(k: string, v: string) { try { localStorage.setItem(k, v) } catch { /* private window: the setting lasts until the page closes */ } },
}

/** A short two-note chime made in the browser, so there is no sound file to load. */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime
  ;[880, 1175].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, now + i * 0.18)
    g.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.4)
    o.connect(g).connect(ctx.destination); o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.45)
  })
}

/** Checks for new orders every 20 seconds while the admin is open. */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [openedIds, setOpenedIds] = useState<string[]>([])
  const [muted, setMuted] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [tick, setTick] = useState(0)
  const audio = useRef<AudioContext | null>(null)
  const known = useRef<Set<string> | null>(null) // null until the first check, which only sets the baseline
  const mutedRef = useRef(false)

  useEffect(() => {
    const m = store.get(MUTE_KEY) === '1'
    setMuted(m); mutedRef.current = m
    try { setOpenedIds(JSON.parse(store.get(OPENED_KEY) ?? '[]')) } catch { /* ignore a damaged value */ }
  }, [])

  const turnOnSound = useCallback(() => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audio.current ??= new AC()
      void audio.current.resume().then(() => { setSoundOn(true); if (!mutedRef.current && audio.current) chime(audio.current) })
    } catch { /* no audio in this browser: the badge still works */ }
  }, [])

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next; setMuted(next); store.set(MUTE_KEY, next ? '1' : '0')
    if (!next) turnOnSound()
  }, [turnOnSound])

  const opened = useCallback((id: string) => {
    setOpenedIds((cur) => {
      if (cur.includes(id)) return cur
      const next = [...cur, id].slice(-200)
      store.set(OPENED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    let stop = false
    async function check() {
      try {
        const { items } = await acall<{ items: Alert[] }>('/orders/alerts')
        if (stop) return
        setAlerts(items)
        const seen = known.current
        const fresh = seen ? items.filter((a) => !seen.has(a._id)) : []
        known.current = new Set(items.map((a) => a._id))
        if (fresh.length) {
          setTick((t) => t + 1)
          if (!mutedRef.current && audio.current?.state === 'running') chime(audio.current)
        }
      } catch { /* offline or signed out: try again at the next check */ }
    }
    void check()
    const t = setInterval(() => { if (!document.hidden) void check() }, POLL_MS)
    const vis = () => { if (!document.hidden) void check() }
    document.addEventListener('visibilitychange', vis)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [])

  const count = alerts.filter((a) => !openedIds.includes(a._id)).length
  useEffect(() => { document.title = count ? `(${count}) ${TITLE}` : TITLE }, [count])
  // Next resets the title on page changes; put the count back after a moment
  useEffect(() => { const t = setInterval(() => { const want = count ? `(${count}) ${TITLE}` : TITLE; if (document.title.startsWith('(') !== !!count) document.title = want }, 1500); return () => clearInterval(t) }, [count])

  return <AlertsCtx.Provider value={{ count, tick, muted, soundOn, toggleMute, turnOnSound, opened }}>{children}</AlertsCtx.Provider>
}

/** Sound switch in the admin header. Browsers keep sound off until the first tap, so that tap is asked for once. */
export function SoundBar() {
  const { muted, soundOn, toggleMute, turnOnSound } = useAlerts()
  return (
    <div className="a-head" role="region" aria-label="Order alerts">
      {!muted && !soundOn && <button type="button" className="a-tap" onClick={turnOnSound}>Tap to turn on order sound</button>}
      <button type="button" className="a-mute" onClick={toggleMute} aria-pressed={muted}>{muted ? '🔇 Sound off · Turn on' : '🔔 Sound on · Mute'}</button>
    </div>
  )
}

/** Opens WhatsApp with a ready message. Click-to-chat only; nothing is sent from the server. */
export function WhatsAppButton({ order, className = 'btn sm line2' }: { order: { orderNo: string; total: number; contact: { name: string; phone: string } }; className?: string }) {
  const digits = order.contact.phone.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) return null
  const text = `Hi ${order.contact.name}, this is Raju Fishes. Your order #${order.orderNo} is confirmed. ${rupees(order.total)}.`
  return <a className={className} href={`https://wa.me/91${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp customer</a>
}
