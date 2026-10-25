import Link from 'next/link'

export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <main>
      <div className="wrap lost">
        <h1>{title}</h1>
        <p>{text}</p>
        <Link href="/products" className="btn">Shop the catch</Link>
      </div>
    </main>
  )
}
