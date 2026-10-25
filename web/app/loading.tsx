import { Sk, SkCards, SkPage } from '@/components/Skel'

export default function Loading() {
  return (
    <SkPage wrap={false}>
      <div className="wrap"><Sk className="sk-hero" h="auto" w="100%" /></div>
      <div className="wrap"><SkCards n={8} /></div>
    </SkPage>
  )
}
