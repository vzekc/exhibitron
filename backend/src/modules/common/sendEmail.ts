import 'dotenv/config'
import nodemailer from 'nodemailer'
import { pino } from 'pino'

const logger = pino({ level: process.env.TEST_LOG_LEVEL || 'fatal' })

interface EmailOptions {
  from?: string
  to: string[]
  subject: string
  body: { html: string; text: string }
  attachments?: { filename: string; content: string }[]
}

export async function sendEmail({
  from,
  to,
  subject,
  body,
  attachments,
}: EmailOptions): Promise<void> {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    ADMIN_EMAIL,
    ADMIN_EMAIL_NAME,
    DEBUG_EMAIL,
  } = process.env
  if (!SMTP_HOST) {
    logger.warn('SMTP_HOST is not set, email will not be sent')
    return
  }
  if (!from && !ADMIN_EMAIL) {
    logger.error('ADMIN_EMAIL is not set, from address is required to send email')
    return
  }
  console.info('Sending email to', to, 'with subject', subject, ' via ', SMTP_HOST)
  const auth =
    (SMTP_USERNAME && SMTP_PASSWORD && { user: SMTP_USERNAME, pass: SMTP_PASSWORD }) || {}
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: false,
    auth,
    debug: !!DEBUG_EMAIL,
    logger: !!DEBUG_EMAIL,
  })
  const { html, text } = body

  const mailOptions = {
    from: from || (ADMIN_EMAIL_NAME ? `${ADMIN_EMAIL_NAME} <${ADMIN_EMAIL}>` : ADMIN_EMAIL),
    to,
    subject,
    text,
    html,
    attachments,
  }

  // need to guard against null transporter for testing
  await transporter?.sendMail(mailOptions)
}
