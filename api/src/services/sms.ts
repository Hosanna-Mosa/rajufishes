import { env } from '../config/env.js'
import { HttpError } from '../lib/errors.js'

/**
 * Sends the OTP text. MSG91 is the chosen provider but is not connected yet (Round 3).
 * In OTP_MODE=test nothing is sent: the fixed OTP_TEST_CODE is the code.
 */
export async function sendOtpSms(_phone: string, _code: string): Promise<void> {
  if (env.OTP_MODE === 'test') return
  if (env.SMS_PROVIDER !== 'msg91' || !env.MSG91_AUTH_KEY) {
    throw new HttpError(503, 'SMS sign in is not set up yet.')
  }
  throw new HttpError(503, 'MSG91 sending is connected in Round 3.')
}
