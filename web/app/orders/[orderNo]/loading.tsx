import { Sk, SkHead, SkLines, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage>
      <SkHead />
      <Sk h={64} style={{ marginBottom: 24 }} />
      <SkLines n={2} />
    </SkPage>
  )
}
