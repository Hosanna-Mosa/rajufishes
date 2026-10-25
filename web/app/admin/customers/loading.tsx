import { Sk, SkPage, SkTable } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage wrap={false}>
      <Sk w={220} h={36} style={{ marginBottom: 12 }} />
      <Sk w={360} h={16} style={{ marginBottom: 24 }} />
      <SkTable rows={8} />
    </SkPage>
  )
}
