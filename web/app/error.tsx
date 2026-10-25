'use client'
import Link from 'next/link'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap lost">
      <h1>Something went wrong.</h1>
      <p>It was on our side. Please try again. If it keeps happening, call us from the Contact page.</p>
      <button type="button" className="btn" onClick={reset}>Try again</button>
      <p><Link href="/contact" className="textlink">Contact us</Link></p>
    </main>
  )
}
