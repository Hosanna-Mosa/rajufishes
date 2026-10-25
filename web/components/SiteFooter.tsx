import { FooterCols } from './FooterCols'
import type { Resolved } from '@/lib/business'

export function SiteFooter({ biz }: { biz: Resolved }) {
  const { b } = biz
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-top">
          <span className="big">{b.name}</span>
          <FooterCols />
        </div>
        <p className="reach">All-India delivery · Online or cash on delivery · Free delivery over {b.freeOver}</p>
        <p className="reach">{b.phone} · {b.email} · {b.address}</p>
        <p className="reach">FSSAI {b.fssai} · GST {b.gst}</p>
      </div>
    </footer>
  )
}
