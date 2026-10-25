import type { ReactNode } from 'react'
import { Stripes } from './Stripes'

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main>
      <div className="banner">
        <div className="wrap">
          <div className="crumb">Home / {title}</div>
          <h1 className="st">{title}</h1>
          <p className="sub">{intro}</p>
        </div>
        <Stripes />
      </div>
      <div className="wrap policy">{children}</div>
    </main>
  )
}
