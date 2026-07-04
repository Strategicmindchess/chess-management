import 'server-only';
import { sendMail } from './mailer';
import { OTP_TTL_MS } from '@/lib/constants';

const OTP_TTL_MINUTES = Math.round(OTP_TTL_MS / 60_000);

function otpEmailHtml(options: { heading: string; greeting: string; body: string; code: string }) {
  const { heading, greeting, body, code } = options;

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4338ca;">${heading}</h2>
      <p>${greeting}</p>
      <p>${body}</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; background: #eef2ff; color: #4338ca; padding: 16px; border-radius: 12px;">${code}</p>
      <p style="color: #64748b; font-size: 13px;">This code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request it, you can safely ignore this email.</p>
    </div>
  `;
}

export async function sendSignupOtpEmail(to: string, name: string, code: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Verify your email · Strategic Mind Chess',
    html: otpEmailHtml({
      heading: 'Confirm your email address',
      greeting: `Hi ${name},`,
      body: 'Use the code below to verify your email and finish creating your SMC account.',
      code,
    }),
  });
}

export async function sendPasswordResetOtpEmail(
  to: string,
  name: string,
  code: string,
): Promise<void> {
  await sendMail({
    to,
    subject: 'Reset your password · Strategic Mind Chess',
    html: otpEmailHtml({
      heading: 'Reset your password',
      greeting: `Hi ${name},`,
      body: 'Use the code below to reset your password.',
      code,
    }),
  });
}
