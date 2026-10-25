'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { reducedMotion } from '@/lib/toast'

/** What rises into place when it first scrolls into view. The header and the top bar are not in this list. */
const TARGETS = [
  '.grid > .card', '.also .card',            // product cards
  '.sec-h', '.also > h2', '.also > .sec-h',  // section headings
  '.cats > .cat', '.kinds > .kindbox',       // category photo tiles and the kind boxes
  '.promise > div',                          // the promise strip
  '.prose-row > *', '.prose .frame',         // About page blocks and images
  '.ftr-top .big', '.ftr-cols > nav', '.ftr .reach', // footer
].join(',')

const ROW = 70 // ms between neighbours in a row, same as --reveal-gap in theme.css

/**
 * Scroll reveals. The hiding is done here, after the page has loaded, never by default CSS, so the
 * page is fully visible if the script is slow or fails. Each element is revealed once and then left alone.
 * Only opacity and transform change, so nothing shifts.
 */
export function Reveal() {
  const path = usePathname()

  useEffect(() => {
    if (path.startsWith('/admin') || reducedMotion()) return
    const pending = new Set<HTMLElement>()

    const show = (el: HTMLElement, delay: number, animate: boolean) => {
      if (el.dataset.rv !== 'p') return
      pending.delete(el)
      io.unobserve(el)
      if (!animate) { el.dataset.rv = 'done'; return }
      el.style.setProperty('--rv-delay', `${delay}ms`)
      el.dataset.rv = 'in'
      setTimeout(() => { el.dataset.rv = 'done'; el.style.removeProperty('--rv-delay') }, 600 + delay + 120)
    }

    const io = new IntersectionObserver((entries) => {
      const rows = new Map<number, HTMLElement[]>()
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const key = Math.round(e.boundingClientRect.top / 8)
        rows.set(key, [...(rows.get(key) ?? []), e.target as HTMLElement])
      }
      for (const els of rows.values()) {
        els.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
        els.forEach((el, i) => show(el, i * ROW, true))
      }
    }, { rootMargin: '0px', threshold: 0 })

    const scan = () => {
      const h = window.innerHeight
      document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
        if (el.dataset.rv || el.closest('header')) return
        if (el.getBoundingClientRect().top < h) return // already on the first screen: leave it alone
        el.dataset.rv = 'p'
        pending.add(el)
        io.observe(el)
      })
    }

    // after a fast scroll or a jump, anything already above the screen is shown at once
    let tick = 0
    const onScroll = () => {
      if (tick) return
      tick = requestAnimationFrame(() => {
        tick = 0
        pending.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) show(el, 0, false) })
      })
    }

    let scanning = 0
    const later = () => { cancelAnimationFrame(scanning); scanning = requestAnimationFrame(scan) }
    const mo = new MutationObserver(later)
    const start = () => { scan(); mo.observe(document.body, { childList: true, subtree: true }) }
    // wait until React has finished hydrating, or the attribute we add would not match the server HTML
    const settle = () => { t = window.setTimeout(start, 500) }
    let t = 0
    if (document.readyState === 'complete') settle(); else window.addEventListener('load', settle, { once: true })

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(t); window.removeEventListener('load', settle); window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(tick); cancelAnimationFrame(scanning); mo.disconnect(); io.disconnect()
      // leaving the page must never leave anything hidden
      pending.forEach((el) => { el.dataset.rv = 'done' })
    }
  }, [path])

  return null
}
