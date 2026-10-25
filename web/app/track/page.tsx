import { redirect } from 'next/navigation'

/** Old style link (?orderNo=&token=) lands on the order page. */
export default async function Track({ searchParams }: { searchParams: Promise<{ orderNo?: string; token?: string }> }) {
  const { orderNo, token } = await searchParams
  if (orderNo && /^\d{3,10}$/.test(orderNo)) redirect(`/orders/${orderNo}${token ? `?token=${encodeURIComponent(token)}` : ''}`)
  redirect('/account')
}
