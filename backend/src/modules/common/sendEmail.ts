import 'dotenv/config'
import nodemailer from 'nodemailer'
import { ReactNode } from 'react'
import { convert } from 'html-to-text'
import ReactDOMServer from 'react-dom/server'

interface EmailOptions {
  from?: string
  to: string[]
  subject: string
  body: { html: string; text: string }
}

export async function sendEmail({
  from,
  to,
  subject,
  body,
}: EmailOptions): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD } = process.env
  if (!SMTP_HOST) {
    console.error('SMTP_HOST is not set, email will not be sent')
    return
  }
  console.info(
    'Sending email to',
    to,
    'with subject',
    subject,
    ' via ',
    SMTP_HOST,
  )
  const auth =
    (SMTP_USERNAME &&
      SMTP_PASSWORD && { user: SMTP_USERNAME, pass: SMTP_PASSWORD }) ||
    {}
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: false,
    auth,
  })
  const { html, text } = body

  const mailOptions = {
    from:
      from ||
      `${process.env.SMTP_DEFAULT_FROM_NAME} <${process.env.SMTP_DEFAULT_FROM_ADDRESS}>`,
    to,
    subject,
    text,
    html,
  }

  await transporter.sendMail(mailOptions)
}

export const makeEmailBody = (element: ReactNode) => {
  const html = ReactDOMServer.renderToStaticMarkup(element)
  const text = convert(html)
  return { html, text }
}
