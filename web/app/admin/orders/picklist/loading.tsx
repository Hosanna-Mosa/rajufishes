import { Sk, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage wrap={false}>
      <Sk w={260} h={36} style={{ marginBottom: 24 }} />
      <div className="sk-cols"><div style={{ display: 'grid', gap: 14 }}><Sk h={120} /><Sk h={120} /><Sk h={120} /></div><div style={{ display: 'grid', gap: 14 }}><Sk h={160} /><Sk h={56} /></div></div>
    </SkPage>
  )
}
