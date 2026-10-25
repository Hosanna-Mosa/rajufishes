import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export interface Mail { to: string; subject: string; text: string }

/**
 * Sends one email. MAIL_PROVIDER=log (default) prints it to the console so development needs no keys;
 * MAIL_PROVIDER=smtp sends through the SMTP_* settings.
 * `mailer` is an object so tests can watch or replace `send`.
 */
export const mailer = {
  async send(mail: Mail): Promise<void> {
    if (env.MAIL_PROVIDER === 'smtp') {
      const t = nodemailer.createTransport({
        host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
      })
      await t.sendMail({ from: env.MAIL_FROM || env.SMTP_USER, ...mail })
      return
    }
    console.log(`[mail:log] to ${mail.to}\n  subject: ${mail.subject}\n${mail.text.split('\n').map((l) => '  ' + l).join('\n')}`)
  },
}
