import { env } from '../config/env.js'
import { HttpError } from '../lib/errors.js'

/** A way to send the sign in code. Add another provider by implementing this one method. */
export interface SmsProvider {
  readonly name: string
  sendOtp(phone: string, code: string): Promise<void>
}

/** MSG91 OTP API. Used only when SMS_PROVIDER=msg91 and its keys are set. */
export class Msg91Provider implements SmsProvider {
  readonly name = 'msg91'
  constructor(private authKey: string, private templateId: string, private senderId = '') {}
  async sendOtp(phone: string, code: string) {
    const q = new URLSearchParams({ template_id: this.templateId, mobile: `91${phone}`, authkey: this.authKey, otp: code, otp_expiry: '5' })
    if (this.senderId) q.set('sender', this.senderId)
    const res = await fetch(`https://control.msg91.com/api/v5/otp?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const body = (await res.json().catch(() => ({}))) as { type?: string }
    if (!res.ok || body.type === 'error') throw new HttpError(502, 'We could not send the code. Please try again.')
  }
}

let override: SmsProvider | null | undefined // tests can swap the provider

export function setSmsProvider(p: SmsProvider | null | undefined) {
  override = p
}

export function getSmsProvider(): SmsProvider | null {
  if (override !== undefined) return override
  if (env.SMS_PROVIDER === 'msg91' && env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID) {
    return new Msg91Provider(env.MSG91_AUTH_KEY, env.MSG91_TEMPLATE_ID, env.MSG91_SENDER_ID)
  }
  return null
}

/**
 * Sends the OTP text. In OTP_MODE=test nothing is sent: the fixed OTP_TEST_CODE is the code.
 * In live mode the provider's keys must be set, otherwise sign in says it is not set up.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (env.OTP_MODE === 'test') return
  const provider = getSmsProvider()
  if (!provider) throw new HttpError(503, 'SMS sign in is not set up yet.')
  await provider.sendOtp(phone, code)
}
