import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    cachedTransporter = null;
    return null;
  }

  const port = Number(SMTP_PORT) || 587;

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  return cachedTransporter;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email via SMTP if configured (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`
 * in `.env`). Falls back to logging the message to the console so OTP codes
 * remain usable in local development before real SMTP credentials exist.
 */
export async function sendMail({ to, subject, html }: SendMailInput): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n📧 [dev email fallback] To: ${to}\nSubject: ${subject}\n${stripHtml(html)}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Strategic Mind Chess <no-reply@strategicmindchess.com>',
    to,
    subject,
    html,
  });
}
