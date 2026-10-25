'use client'
import Link from 'next/link'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap lost">
      <div className="n st">Oops</div>
      <h1 className="st">Rough water.</h1>
      <p>Something went wrong on our side. Please try again. If it keeps happening, call us from the Contact page.</p>
      <button type="button" className="btn yellow big st" style={{ padding: '0 32px' }} onClick={reset}>Try again</button>
      <p><Link href="/contact"><u>Contact us</u></Link></p>
    </main>
  )
}
