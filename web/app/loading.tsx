export default function Loading() {
  return (
    <main className="wrap" aria-busy="true" style={{ padding: '64px var(--gut)', minHeight: '120vh' }}>
      <p className="st" style={{ fontSize: 32, fontWeight: 800 }} role="status">Hauling in the nets…</p>
      <div className="skel-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skel" />)}</div>
    </main>
  )
}
