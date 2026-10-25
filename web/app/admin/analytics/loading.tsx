import { Sk, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage wrap={false}>
      <Sk w={200} h={36} style={{ marginBottom: 12 }} />
      <Sk w={320} h={16} style={{ marginBottom: 24 }} />
      <div className="stats an-stats">{Array.from({ length: 6 }, (_, i) => <Sk key={i} h={96} />)}</div>
      <Sk h={260} style={{ marginBottom: 24 }} />
      <Sk h={200} />
    </SkPage>
  )
}
