import { Sk, SkCards, SkHead, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage>
      <SkHead lines={2} />
      <div className="sk-tabs">{[110, 90, 130, 100].map((w) => <Sk key={w} w={w} h={40} r={999} />)}</div>
      <SkCards n={8} />
    </SkPage>
  )
}
