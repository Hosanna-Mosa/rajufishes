import { Sk, SkForm, SkHead, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage>
      <SkHead />
      <div className="sk-cols"><SkForm fields={6} /><div style={{ display: 'grid', gap: 14 }}><Sk h={22} /><Sk h={22} /><Sk h={22} /><Sk h={56} /></div></div>
    </SkPage>
  )
}
