import { expireHolds } from '../services/stock.js'

/** Every minute: cancel unpaid online orders past their 30 minute hold and put the stock back. */
export function startExpiryJob() {
  const t = setInterval(() => {
    expireHolds().then((n) => n && console.log(`Expired ${n} unpaid order(s)`)).catch((e) => console.error('expiry job failed', e))
  }, 60_000)
  t.unref()
  return () => clearInterval(t)
}
