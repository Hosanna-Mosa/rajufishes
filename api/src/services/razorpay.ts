import crypto from 'node:crypto'
import { env, isProd } from '../config/env.js'
import { HttpError } from '../lib/errors.js'

// With no Razorpay keys, development uses a clearly fake order id and a fixed local secret.
const DEV_SECRET = 'dev_only_razorpay_secret'
const live = () => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
export const razorpayIsMock = () => !live()
export const razorpayKeyId = () => (live() ? env.RAZORPAY_KEY_ID : 'rzp_test_dev')
const secret = () => (live() ? env.RAZORPAY_KEY_SECRET : DEV_SECRET)

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  if (!live()) {
    if (isProd) throw new HttpError(503, 'Online payment is not set up.')
    return { id: `order_dev_${crypto.randomBytes(8).toString('hex')}`, keyId: 'rzp_test_dev', amount: amountPaise, mock: true }
  }
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64'),
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
  })
  if (!res.ok) throw new HttpError(502, 'Could not start the payment. Please try again.')
  const data = (await res.json()) as { id: string }
  return { id: data.id, keyId: env.RAZORPAY_KEY_ID, amount: amountPaise, mock: false }
}

const eq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

export function signPayment(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', secret()).update(`${orderId}|${paymentId}`).digest('hex')
}
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  return eq(signPayment(orderId, paymentId), signature)
}
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const key = env.RAZORPAY_WEBHOOK_SECRET || (isProd ? '' : DEV_SECRET)
  if (!key) return false
  return eq(crypto.createHmac('sha256', key).update(rawBody).digest('hex'), signature)
}
