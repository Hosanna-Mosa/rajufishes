import Link from 'next/link'
import { getMarket } from '@/lib/api'
import { landedTime, priceText, weightLabel } from '@/lib/format'
import { AddButton } from './AddButton'

export async function MarketPanel() {
  const data = await getMarket()
  const items = data?.items ?? []
  const time = landedTime(data?.updatedAt)
  return (
    <div className="market">
      <div className="market-h">
        <span className="t">Today&apos;s market</span>
        <span>{time ? `Updated ${time} · ` : ''}price per kg unless marked</span>
      </div>
      {items.length === 0 && <p className="market-empty">{data ? 'The market board is empty right now. See the full catalogue below.' : 'We cannot load today’s prices right now. Please try again in a minute.'}</p>}
      {items.map((p) => (
        <div className="mrow" key={p._id}>
          <Link className="n" href={`/products/${p.slug}`}>{p.name}</Link>
          <span className="tag">{priceText(p)}{p.unit === 'pack' && p.packWeightG ? ` · ${weightLabel(p.packWeightG)}` : ''}</span>
          <AddButton product={p} />
        </div>
      ))}
      <Link className="market-more" href="/products">See the full catch ↓</Link>
    </div>
  )
}
