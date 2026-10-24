import Link from 'next/link'
import { Stripes } from './Stripes'

export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <main>
      <div className="banner">
        <div className="wrap">
          <h1 className="st">{title}</h1>
          <p className="sub">{text}</p>
        </div>
        <Stripes />
      </div>
      <div className="wrap lost">
        <Link href="/products" className="btn yellow big st" style={{ padding: '0 32px' }}>Shop the catch</Link>
      </div>
    </main>
  )
}
