'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isNoTrack, setQueueing, trackPageView } from '@/lib/analytics'
import { analyticsEnabled, startFirebase } from '@/lib/firebaseSink'
import { COOKIE_DECLINE, COOKIE_OK, COOKIE_TEXT } from '@/lib/analyticsCopy'

const KEY = 'rf_consent'
type Choice = 'yes' | 'no' | null
const read = (): Choice => { try { const v = localStorage.getItem(KEY); return v === 'yes' || v === 'no' ? v : null } catch { return null } }

/** Cookie notice plus the lazy start of Firebase Analytics. Does nothing at all when Firebase is not set up. */
export function AnalyticsProvider() {
  const path = usePathname() || '/'
  const [on, setOn] = useState(false)
  const [choice, setChoice] = useState<Choice>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { setOn(analyticsEnabled()); setChoice(read()) }, [])

  const blocked = on && isNoTrack(path)

  // start Firebase after OK, once the page is idle or the visitor first touches it, so it never slows the first view
  useEffect(() => {
    if (!on || choice !== 'yes' || blocked || ready) return
    let done = false
    const go = () => { if (done) return; done = true; cleanup(); void startFirebase().then((ok) => ok && setReady(true)) }
    const evs = ['pointerdown', 'keydown', 'scroll'] as const
    const cleanup = () => { evs.forEach((e) => window.removeEventListener(e, go)); clearTimeout(t) }
    evs.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }))
    const t = window.setTimeout(go, 3500)
    return cleanup
  }, [on, choice, blocked, ready])

  const counting = on && !blocked && choice !== 'no'
  useEffect(() => { setQueueing(counting) }, [counting])
  // runs before the page's own effects (this component sits above the page), so page_view always comes first
  useEffect(() => { if (counting) trackPageView(path) }, [counting, path])

  if (!on || choice !== null || blocked) return null
  const pick = (c: 'yes' | 'no') => { try { localStorage.setItem(KEY, c) } catch { /* blocked storage */ } setChoice(c) }
  return (
    <div className="cookie" role="region" aria-label="Cookies">
      <span>{COOKIE_TEXT}</span>
      <span className="cookie-btns">
        <button type="button" className="cookie-ok" onClick={() => pick('yes')}>{COOKIE_OK}</button>
        <button type="button" className="cookie-no" onClick={() => pick('no')}>{COOKIE_DECLINE}</button>
      </span>
    </div>
  )
}
