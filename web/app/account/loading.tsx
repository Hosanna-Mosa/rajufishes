import { Sk, SkHead, SkLines, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage>
      <SkHead />
      <div className="sk-tabs">{[100, 110].map((w) => <Sk key={w} w={w} h={40} r={999} />)}</div>
      <SkLines n={3} />
    </SkPage>
  )
}
