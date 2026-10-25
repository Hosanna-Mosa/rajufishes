import Link from 'next/link'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <main className="wrap lost">
      <h1>This one got away.</h1>
      <p>We could not find that page. It may have moved, or the link may be wrong.</p>
      <Link href="/products" className="btn">Shop the catch</Link>
    </main>
  )
}
