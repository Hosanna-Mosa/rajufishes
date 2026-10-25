import { Sk, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage>
      <div className="sk-pdp">
        <Sk className="sk-big" h="auto" />
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Sk w={90} h={14} /><Sk w="80%" h={44} /><Sk w="50%" h={18} /><Sk w={140} h={32} />
          <Sk h={48} /><Sk h={48} /><Sk h={56} />
        </div>
      </div>
    </SkPage>
  )
}
