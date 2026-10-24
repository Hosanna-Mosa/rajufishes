import Link from 'next/link'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <main className="wrap lost">
      <div className="n st">404</div>
      <h1 className="st">This one got away.</h1>
      <p>We could not find that page. It may have moved, or the link may be wrong.</p>
      <Link href="/products" className="btn yellow big st" style={{ padding: '0 32px' }}>Shop the catch</Link>
    </main>
  )
}
