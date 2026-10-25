import { Sk, SkHead, SkLines, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage>
      <SkHead />
      <div className="sk-cols"><SkLines n={3} /><div style={{ display: 'grid', gap: 14 }}><Sk h={22} /><Sk h={22} /><Sk h={22} /><Sk h={56} /></div></div>
    </SkPage>
  )
}
