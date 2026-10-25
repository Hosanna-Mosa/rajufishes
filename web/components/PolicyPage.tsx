import type { ReactNode } from 'react'

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main>
      <div className="wrap policy">
        <div className="crumb">Home / {title}</div>
        <h1>{title}</h1>
        <p className="sub">{intro}</p>
        {children}
      </div>
    </main>
  )
}
