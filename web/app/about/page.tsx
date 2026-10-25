import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'Raju Fishes is a family fishing business. We catch, clean, ice and send fish from our own boats.',
}

const Photo = ({ text }: { text: string }) => (
  <div className="frame"><span className="ph" role="img" aria-label={text}><span className="chiplab">{text.replace('Photo placeholder: ', '')}</span></span></div>
)

export default function About() {
  return (
    <main>
      <div className="wrap">
        <div className="banner">
          <div className="crumb">Home / About</div>
          <h1>About us</h1>
          <p className="sub">A family, a few boats and a cold box.</p>
        </div>
      </div>
      <div className="wrap prose">
        <div className="prose-row">
          <div>
            <h2>Our boats</h2>
            <p>Raju Fishes is a family business. Our boats go out before dawn and come back with the morning catch, which we clean and ice on the shore.</p>
            <p>What you see on the Today&apos;s market board is what the boats landed that morning.</p>
          </div>
          <div><Photo text="Photo placeholder: the boats at sunrise" /></div>
        </div>
        <div className="prose-row">
          <div><Photo text="Photo placeholder: packing an order on ice" /></div>
          <div>
            <h2>How we send it</h2>
            <p>Fresh fish is packed in an insulated box with ice. Dry and frozen packs travel all over India. You can pay online or in cash when it arrives.</p>
            <Link href="/products" className="btn">Shop the catch</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
