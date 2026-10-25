import type { OrderT } from '@/lib/client'

const STEPS = ['packed', 'shipped', 'delivered'] as const

/** Packed / Shipped / Delivered boxes, yellow when reached. A cancelled order shows a red flag instead. */
export function StatusSteps({ status }: { status: OrderT['status'] }) {
  if (status === 'cancelled') return <div className="cancelflag st" role="status">Cancelled</div>
  const at = status === 'placed' ? -1 : STEPS.indexOf(status)
  return (
    <div className="steps3 st" role="list" aria-label="Order progress">
      {STEPS.map((s, i) => <div role="listitem" key={s} className={i <= at ? 'done' : ''}>{s}</div>)}
    </div>
  )
}

export const statusText = (o: Pick<OrderT, 'status' | 'payment'>) =>
  o.status === 'cancelled' ? 'Cancelled'
    : o.payment.method === 'razorpay' ? (o.payment.status === 'paid' ? 'Paid online' : 'Payment pending')
    : o.payment.status === 'cod_collected' ? 'Cash collected' : 'Cash on delivery'
