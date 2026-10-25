/** The blue bar: a slow ticker, right to left. The messages are repeated so the loop has no gap; the copy is hidden from screen readers. */
export function TopTicker({ messages }: { messages: string[] }) {
  const group = (hidden: boolean) => (
    <div className="ticker-grp" aria-hidden={hidden || undefined}>
      {[...messages, ...messages].map((m, i) => (
        <span className="ticker-item" key={i}>{m}<i className="ticker-dot" aria-hidden="true" /></span>
      ))}
    </div>
  )
  return (
    <div className="utility" role="region" aria-label="Shop news">
      <div className="ticker-track">{group(false)}{group(true)}</div>
    </div>
  )
}
